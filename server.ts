import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || "glm-4-flash";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// In-memory token store (token -> {username, expires})
const adminTokens = new Map<string, { username: string; expires: number }>();
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || "3306");
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "heyi_db";

let pool: mysql.Pool;

async function fetchWithRetry(url: string, init: RequestInit, retries: number = 2, delayMs: number = 800): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, init);
      return response;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.cause?.code === "ENOTFOUND" || err?.cause?.code === "ECONNRESET" || err?.cause?.code === "ETIMEDOUT" || err?.message?.includes("fetch failed");
      if (i < retries && isRetryable) {
        console.warn(`Fetch retry ${i + 1}/${retries} after ${delayMs}ms due to`, err?.cause?.code || err?.message);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

async function initDatabase() {
  // Create database if not exists (ignore if already exists or insufficient privileges)
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (e: any) {
    if (e.code !== 'ER_DBACCESS_DENIED_ERROR') throw e;
    console.warn(`Warning: no CREATE DATABASE privilege, assuming '${MYSQL_DATABASE}' already exists.`);
  }
  await conn.end();

  // Create connection pool
  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(36),
      industry VARCHAR(255),
      pain_point_raw TEXT,
      ai_cognition_score DOUBLE DEFAULT 0,
      narrative_value_score DOUBLE DEFAULT 0,
      total_score DOUBLE DEFAULT 0,
      narrative_value_tags TEXT,
      contact_info TEXT,
      contact_name VARCHAR(100),
      contact_method VARCHAR(50),
      source VARCHAR(50) DEFAULT 'ai_chat',
      research_report_url TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      follow_up_status VARCHAR(50) DEFAULT 'new',
      follow_up_notes TEXT,
      follow_up_at DATETIME,
      assigned_to VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Migrate: add new columns if not exist (for existing databases)
  const addColumnIfNotExists = async (col: string, def: string) => {
    try {
      await pool.query(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
  };
  await addColumnIfNotExists('session_id', 'VARCHAR(36)');
  await addColumnIfNotExists('contact_name', 'VARCHAR(100)');
  await addColumnIfNotExists('contact_method', 'VARCHAR(50)');
  await addColumnIfNotExists('source', "VARCHAR(50) DEFAULT 'ai_chat'");
  await addColumnIfNotExists('follow_up_status', "VARCHAR(50) DEFAULT 'new'");
  await addColumnIfNotExists('follow_up_notes', 'TEXT');
  await addColumnIfNotExists('follow_up_at', 'DATETIME');
  await addColumnIfNotExists('assigned_to', 'VARCHAR(100)');
  await addColumnIfNotExists('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('conversation_summary', 'TEXT');
  await addColumnIfNotExists('needs_human', "VARCHAR(20) DEFAULT 'auto'");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats (
      id INT PRIMARY KEY,
      insights_generated INT DEFAULT 0,
      leads_captured INT DEFAULT 0,
      active_sessions INT DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_session (session_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL,
      page VARCHAR(255) DEFAULT '/',
      ip VARCHAR(50),
      user_agent TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_visitors_session (session_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event VARCHAR(255) NOT NULL,
      detail TEXT,
      level VARCHAR(20) DEFAULT 'info',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      industry VARCHAR(100),
      scenario VARCHAR(255),
      challenge TEXT,
      solution TEXT,
      result TEXT,
      tags TEXT,
      cover_emoji VARCHAR(10) DEFAULT '💼',
      published BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert initial stats if not exists
  await pool.query(`INSERT IGNORE INTO stats (id, insights_generated, leads_captured, active_sessions) VALUES (1, 0, 0, 0)`);

  // Seed cases if empty
  const [caseCount] = await pool.query("SELECT COUNT(*) as cnt FROM cases");
  if ((caseCount as any[])[0]?.cnt === 0) {
    const seedCases = [
      {
        id: 'case-001', title: '智能质检系统', industry: '制造业', scenario: '产线质量检验',
        challenge: '传统产线依赖人工目检，漏检率高、效率低，每天需 8 名质检员轮班，人工成本居高不下。',
        solution: '部署基于计算机视觉的 AI 质检系统，结合工业相机与边缘计算，实现毫秒级缺陷识别与自动分拣。',
        result: '漏检率降低 95%，人力成本节省 60%，产线效率提升 3 倍，6 个月内实现 ROI。',
        tags: '视觉检测,工业AI,边缘计算,降本增效', cover_emoji: '🏭'
      },
      {
        id: 'case-002', title: '智能客服中台', industry: '金融', scenario: '客户服务与咨询',
        challenge: '银行日均处理 5000+ 客户咨询，人工坐席排队严重，重复问题占比 70%，客户满意度持续下降。',
        solution: '构建多轮对话 AI 客服中台，集成知识库与工单系统，实现智能分流与自动应答。',
        result: '自动解决率提升至 85%，平均响应时间从 12 分钟降至 30 秒，客户满意度提升 40%。',
        tags: 'NLP,智能客服,知识库,服务效率', cover_emoji: '🏦'
      },
      {
        id: 'case-003', title: 'AI 辅助研发平台', industry: '软件', scenario: '研发效能提升',
        challenge: '200 人研发团队面临代码审查效率低、重复开发严重、新人上手慢等痛点，交付周期长。',
        solution: '部署 AI 编码助手与智能 Code Review 系统，结合企业知识库实现上下文感知的代码生成与建议。',
        result: '代码审查时间缩短 50%，重复代码减少 35%，新人上手时间从 3 个月缩短至 1 个月。',
        tags: '代码生成,Code Review,研发效能,企业知识库', cover_emoji: '💻'
      },
      {
        id: 'case-004', title: '智能文档处理系统', industry: '法律', scenario: '合同审查与合规',
        challenge: '律所每月处理 2000+ 份合同，人工审查平均耗时 4 小时/份，关键条款遗漏风险高。',
        solution: '基于大语言模型的合同智能审查系统，自动提取关键条款、识别风险点并生成审查报告。',
        result: '审查效率提升 10 倍，风险条款识别准确率达 96%，律师可专注于高价值谈判工作。',
        tags: '文档处理,LLM,合规审查,法律科技', cover_emoji: '📋'
      },
      {
        id: 'case-005', title: '数据驱动运营平台', industry: '电商', scenario: '精准营销与用户运营',
        challenge: '电商平台拥有 500 万用户但缺乏精细化运营能力，营销 ROI 低，用户流失率高达 45%。',
        solution: '构建用户画像与 AI 预测模型，实现千人千面的个性化推荐和精准触达策略。',
        result: '营销 ROI 提升 220%，用户留存率从 55% 提升至 78%，GMV 季度环比增长 35%。',
        tags: '用户画像,推荐系统,精准营销,数据运营', cover_emoji: '🛒'
      },
      {
        id: 'case-006', title: '智慧医疗辅助诊断', industry: '医疗', scenario: '影像辅助诊断',
        challenge: '三甲医院放射科日均阅片 800+，医生工作负荷大，基层医院诊断能力不足导致误诊率偏高。',
        solution: '训练多模态医学影像 AI 模型，辅助医生快速识别病灶、量化分析并生成结构化报告。',
        result: '阅片效率提升 4 倍，早期病变检出率提升 30%，基层医院诊断准确率从 75% 提升至 92%。',
        tags: '医疗AI,影像识别,辅助诊断,智慧医疗', cover_emoji: '🏥'
      },
    ];

    for (const c of seedCases) {
      await pool.query(
        `INSERT INTO cases (id, title, industry, scenario, challenge, solution, result, tags, cover_emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.title, c.industry, c.scenario, c.challenge, c.solution, c.result, c.tags, c.cover_emoji]
      );
    }
  }

  console.log("MySQL database initialized successfully.");
}

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // 兼容未剥离 /hitech 前缀的代理请求
  app.use((req, _res, next) => {
    if (req.url.startsWith("/hitech/api/")) req.url = req.url.slice("/hitech".length);
    next();
  });

  // API Routes
  app.get("/api/stats", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM stats WHERE id = 1");
      res.json((rows as any[])[0]);
    } catch (err) {
      console.error("Stats query error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/leads", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error("Leads query error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const {
        id, session_id, industry, pain_point_raw, ai_cognition_score, narrative_value_score,
        total_score, narrative_value_tags, contact_info, contact_name, contact_method, source,
        conversation_summary
      } = req.body;

      await pool.query(
        `INSERT INTO leads (id, session_id, industry, pain_point_raw, ai_cognition_score, narrative_value_score, total_score, narrative_value_tags, contact_info, contact_name, contact_method, source, conversation_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, session_id, industry, pain_point_raw, ai_cognition_score || 0, narrative_value_score || 0,
         total_score || 0, JSON.stringify(narrative_value_tags || []), contact_info, contact_name, contact_method, source || 'ai_chat',
         JSON.stringify(conversation_summary || {})]
      );

      // Update global stats
      await pool.query("UPDATE stats SET leads_captured = leads_captured + 1 WHERE id = 1");

      // Log activity
      await pool.query("INSERT INTO activity_logs (event, detail) VALUES (?, ?)",
        ["新线索捕获", `${contact_name || '未知'} - ${industry || '未知行业'}`]);

      res.json({ success: true });
    } catch (err) {
      console.error("Lead insert error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Update lead follow-up status
  app.put("/api/leads/:id/follow-up", async (req, res) => {
    try {
      const { follow_up_status, follow_up_notes, assigned_to, follow_up_at } = req.body;
      const updates: string[] = [];
      const values: any[] = [];

      if (follow_up_status) { updates.push("follow_up_status = ?"); values.push(follow_up_status); }
      if (follow_up_notes !== undefined) { updates.push("follow_up_notes = ?"); values.push(follow_up_notes); }
      if (assigned_to !== undefined) { updates.push("assigned_to = ?"); values.push(assigned_to); }
      if (follow_up_at) { updates.push("follow_up_at = ?"); values.push(follow_up_at); }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      values.push(req.params.id);
      await pool.query(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, values);

      // Log activity
      await pool.query("INSERT INTO activity_logs (event, detail) VALUES (?, ?)",
        ["线索状态更新", `Lead ${req.params.id} -> ${follow_up_status || 'updated'}`]);

      res.json({ success: true });
    } catch (err) {
      console.error("Lead follow-up update error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/stats/increment-insights", async (req, res) => {
    try {
      await pool.query("UPDATE stats SET insights_generated = insights_generated + 1 WHERE id = 1");
      res.json({ success: true });
    } catch (err) {
      console.error("Stats update error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Track visitor
  app.post("/api/visitors", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const ip = req.ip || req.socket.remoteAddress || "";
      const ua = req.headers["user-agent"] || "";
      await pool.query("INSERT INTO visitors (session_id, page, ip, user_agent) VALUES (?, '/', ?, ?)", [sessionId, ip, ua]);
      // Update active sessions (unique sessions in last 30min)
      await pool.query("UPDATE stats SET active_sessions = (SELECT COUNT(DISTINCT session_id) FROM visitors WHERE visited_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)) WHERE id = 1");
      // Log activity
      await pool.query("INSERT INTO activity_logs (event, detail) VALUES (?, ?)", ["新访客访问", `Session: ${sessionId}`]);
      res.json({ success: true });
    } catch (err) {
      console.error("Visitor track error:", err);
      res.json({ success: false });
    }
  });

  // Dashboard stats: computed from real data
  app.get("/api/dashboard-stats", async (req, res) => {
    try {
      const [statsRows] = await pool.query("SELECT insights_generated, leads_captured, active_sessions FROM stats WHERE id = 1");
      const stats = (statsRows as any[])[0];

      const [visitorRows] = await pool.query("SELECT COUNT(DISTINCT session_id) as total FROM visitors");
      const totalVisitors = (visitorRows as any[])[0]?.total || 0;

      const [consultRows] = await pool.query("SELECT COUNT(DISTINCT session_id) as total FROM messages WHERE role = 'user'");
      const totalConsultations = (consultRows as any[])[0]?.total || 0;

      const [leadRows] = await pool.query("SELECT COUNT(*) as total FROM leads");
      const totalLeads = (leadRows as any[])[0]?.total || 0;

      const [highValueRows] = await pool.query("SELECT COUNT(*) as total FROM leads WHERE total_score >= 0.7");
      const highValueLeads = (highValueRows as any[])[0]?.total || 0;

      const [messageRows] = await pool.query("SELECT COUNT(*) as total FROM messages");
      const totalMessages = (messageRows as any[])[0]?.total || 0;

      res.json({
        insights_generated: stats?.insights_generated || 0,
        leads_captured: stats?.leads_captured || 0,
        active_sessions: stats?.active_sessions || 0,
        total_visitors: totalVisitors,
        total_consultations: totalConsultations,
        total_leads: totalLeads,
        high_value_leads: highValueLeads,
        total_messages: totalMessages,
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Activity logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT event, detail, level, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 20");
      res.json(rows);
    } catch (err) {
      console.error("Activity logs error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Cases API
  app.get("/api/cases", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM cases WHERE published = 1 ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error("Cases query error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/cases/:id", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM cases WHERE id = ?", [req.params.id]);
      res.json((rows as any[])[0] || null);
    } catch (err) {
      console.error("Case detail error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Case search (keyword matching for AI recall)
  async function searchRelevantCases(query: string, limit: number = 3) {
    try {
      const [allCases] = await pool.query("SELECT * FROM cases WHERE published = 1");
      const cases = allCases as any[];
      if (cases.length === 0) return [];

      // Simple keyword relevance scoring
      const keywords = query.toLowerCase().split(/[\s,，、。？?！!]+/).filter(k => k.length >= 2);
      const scored = cases.map(c => {
        const text = `${c.title} ${c.industry} ${c.scenario} ${c.tags} ${c.challenge} ${c.solution}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (text.includes(kw)) score += 1;
          // Industry match boost
          if (c.industry?.toLowerCase().includes(kw)) score += 2;
        }
        // Tag matching
        const tags = (c.tags || '').toLowerCase().split(',');
        for (const kw of keywords) {
          if (tags.some(t => t.includes(kw) || kw.includes(t))) score += 1;
        }
        return { ...c, relevanceScore: score };
      });

      return scored
        .filter(c => c.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  // Get chat history for a session
  app.get("/api/messages/:sessionId", async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        [req.params.sessionId]
      );
      res.json(rows);
    } catch (err) {
      console.error("Messages query error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // AI Chat proxy - uses Zhipu AI (GLM) API
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, chatState, leadData, input, sessionId } = req.body;

      const systemPrompt = "你是和毅智能的数字合伙人。你专业、共情且具有前瞻性。你擅长使用咨询式提问。你的公司全称是'苏州和毅智能科技有限公司'，成立于2018年，业务聚焦软件开发、技术服务、AI 智能体交付及运维。你对公司的经营范围（软件开发、系统集成、数据处理等）有清晰的认知。当访客留下姓氏但性别不明确时，不要称呼'先生'或'女士'，优先使用'[姓氏]总'等中性尊称。";

      // Retrieve relevant cases based on user input
      const relevantCases = await searchRelevantCases(input);
      const casesContext = relevantCases.length > 0
        ? `\n\n📂 相关案例（请在回答中自然引用，不要生硬罗列）：\n${relevantCases.map(c =>
            `【${c.title}】行业: ${c.industry} | 场景: ${c.scenario}\n痛点: ${c.challenge}\n方案: ${c.solution}\n成果: ${c.result}`
          ).join('\n---\n')}`
        : '';
      
      const userPrompt = `
        你是“和毅智能”的数字合伙人，负责和毅智能官网的咨询工作。
        当前对话状态: ${chatState}
        用户输入: ${input}
              
        背景信息:
        公司名称: 苏州和毅智能科技有限公司 (Suzhou HeYi Intelligent Technology Co., Ltd.)
        统一社会信用代码: 92320505MA1W70U07M
        法定代表人: 陈勤思
        成立日期: 2018年03月14日
        注册资本: 100万元整
        公司住所: 苏州高新区浒关分区文昌路277号华美花园21幢2004室
        经营范围: 软件开发；信息系统集成服务；数据处理服务；动漫游戏开发；专业设计服务；翻译服务；咨询策划服务。
        核心业务聚焦: 软件开发、技术服务、AI 智能体交付及运维。
        核心价值观: 和 (Harmony), 毅 (Persistence), 人在回路 (Human-in-the-loop)。
        目标: 识别具有“叙事价值”的高价值线索（复杂问题、组织重塑意图）。
        ${casesContext}
        指令:
        1. 如果状态是 "exploration" (需求探索)，请进行深度咨询式提问，了解用户的痛点和对 AI 的认知。
        2. 如果信息足够，内部转换到 "scoring" (价值评估) 状态，并询问联系方式以提供《架构师简报》。
        3. 保持专业、共情且具有前瞻性的语气。
        4. 绝对不要自称为“合一数智”或其他名称，你的名字是“和毅智能数字合伙人”。
        5. 当用户询问公司资质、经营范围或成立时间等信息时，请根据背景信息中的营业执照内容准确回答。
        6. 当用户咨询的场景与案例库中的案例相似时，请自然地引用相关案例来说明我们的能力和成功经验，增强说服力。
              
        当前线索数据: ${JSON.stringify(leadData)}
              
        请使用中文回答。
      `;

      const zhipuResponse = await fetchWithRetry("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model: ZHIPU_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await zhipuResponse.json();

      if (!zhipuResponse.ok) {
        console.error("Zhipu API Error:", data);
        throw new Error(data.error?.message || "Zhipu API error");
      }

      const text = data.choices?.[0]?.message?.content || "抱歉，我暂时无法回应。";

      // Persist messages to MySQL
      if (sessionId) {
        await pool.query("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)", [sessionId, "user", input]);
        await pool.query("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)", [sessionId, "assistant", text]);
        // Log activity
        await pool.query("INSERT INTO activity_logs (event, detail) VALUES (?, ?)", ["AI对话完成", `Session: ${sessionId}, 输入: ${input.substring(0, 50)}`]);
      }

      res.json({ text });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: "AI service error", message: String(error) });
    }
  });

  // ===== ADMIN API =====

  // Auth middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = adminTokens.get(token)!;
    if (Date.now() > session.expires) {
      adminTokens.delete(token);
      return res.status(401).json({ error: "Token expired" });
    }
    (req as any).adminUser = session.username;
    next();
  };

  // Login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = randomBytes(32).toString("hex");
      adminTokens.set(token, { username, expires: Date.now() + TOKEN_EXPIRY_MS });
      res.json({ token, username });
    } else {
      res.status(401).json({ error: "用户名或密码错误" });
    }
  });

  // Verify token
  app.get("/api/admin/verify", requireAdmin, (req, res) => {
    res.json({ valid: true, username: (req as any).adminUser });
  });

  // Logout
  app.post("/api/admin/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) adminTokens.delete(token);
    res.json({ success: true });
  });

  // Admin: Get all leads (with full details)
  app.get("/api/admin/leads", requireAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Get conversation history for a lead
  app.get("/api/admin/leads/:id/conversation", requireAdmin, async (req, res) => {
    try {
      const [leadRows] = await pool.query("SELECT session_id FROM leads WHERE id = ?", [req.params.id]);
      const lead = (leadRows as any[])[0];
      if (!lead?.session_id) return res.json([]);
      const [rows] = await pool.query(
        "SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        [lead.session_id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Update lead
  app.put("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    try {
      const { industry, contact_name, contact_info, contact_method, follow_up_status, follow_up_notes, assigned_to, total_score, conversation_summary, pain_point_raw } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      if (industry !== undefined) { updates.push("industry = ?"); values.push(industry); }
      if (contact_name !== undefined) { updates.push("contact_name = ?"); values.push(contact_name); }
      if (contact_info !== undefined) { updates.push("contact_info = ?"); values.push(contact_info); }
      if (contact_method !== undefined) { updates.push("contact_method = ?"); values.push(contact_method); }
      if (follow_up_status !== undefined) { updates.push("follow_up_status = ?"); values.push(follow_up_status); }
      if (follow_up_notes !== undefined) { updates.push("follow_up_notes = ?"); values.push(follow_up_notes); }
      if (assigned_to !== undefined) { updates.push("assigned_to = ?"); values.push(assigned_to); }
      if (total_score !== undefined) { updates.push("total_score = ?"); values.push(total_score); }
      if (conversation_summary !== undefined) { updates.push("conversation_summary = ?"); values.push(typeof conversation_summary === 'string' ? conversation_summary : JSON.stringify(conversation_summary)); }
      if (pain_point_raw !== undefined) { updates.push("pain_point_raw = ?"); values.push(pain_point_raw); }
      if (updates.length === 0) return res.status(400).json({ error: "No fields" });
      values.push(req.params.id);
      await pool.query(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, values);
      await pool.query("INSERT INTO activity_logs (event, detail) VALUES (?, ?)", ["管理员更新线索", `Lead ${req.params.id}`]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Delete lead
  app.delete("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM leads WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Get all cases
  app.get("/api/admin/cases", requireAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM cases ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Create case
  app.post("/api/admin/cases", requireAdmin, async (req, res) => {
    try {
      const { id, title, industry, scenario, challenge, solution, result, tags, cover_emoji } = req.body;
      await pool.query(
        `INSERT INTO cases (id, title, industry, scenario, challenge, solution, result, tags, cover_emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id || randomBytes(8).toString("hex"), title, industry, scenario, challenge, solution, result, tags, cover_emoji || "💼"]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Update case
  app.put("/api/admin/cases/:id", requireAdmin, async (req, res) => {
    try {
      const { title, industry, scenario, challenge, solution, result, tags, cover_emoji, published } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      if (title !== undefined) { updates.push("title = ?"); values.push(title); }
      if (industry !== undefined) { updates.push("industry = ?"); values.push(industry); }
      if (scenario !== undefined) { updates.push("scenario = ?"); values.push(scenario); }
      if (challenge !== undefined) { updates.push("challenge = ?"); values.push(challenge); }
      if (solution !== undefined) { updates.push("solution = ?"); values.push(solution); }
      if (result !== undefined) { updates.push("result = ?"); values.push(result); }
      if (tags !== undefined) { updates.push("tags = ?"); values.push(tags); }
      if (cover_emoji !== undefined) { updates.push("cover_emoji = ?"); values.push(cover_emoji); }
      if (published !== undefined) { updates.push("published = ?"); values.push(published); }
      if (updates.length === 0) return res.status(400).json({ error: "No fields" });
      values.push(req.params.id);
      await pool.query(`UPDATE cases SET ${updates.join(", ")} WHERE id = ?`, values);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Admin: Delete case
  app.delete("/api/admin/cases/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM cases WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.get("/admin", (_req, res) => res.redirect(301, "/hitech/admin"));
    app.use("/hitech", express.static(path.join(__dirname, "dist")));
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
