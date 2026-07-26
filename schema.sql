-- 和毅智能官网数据库脚本
-- 数据库: heyi_db
-- 字符集: utf8mb4

CREATE DATABASE IF NOT EXISTS `heyi_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `heyi_db`;

-- 线索表
CREATE TABLE IF NOT EXISTS `leads` (
  `id` VARCHAR(36) PRIMARY KEY,
  `session_id` VARCHAR(36),
  `industry` VARCHAR(255),
  `pain_point_raw` TEXT,
  `ai_cognition_score` DOUBLE DEFAULT 0,
  `narrative_value_score` DOUBLE DEFAULT 0,
  `total_score` DOUBLE DEFAULT 0,
  `narrative_value_tags` TEXT,
  `contact_info` TEXT,
  `contact_name` VARCHAR(100),
  `contact_method` VARCHAR(50),
  `source` VARCHAR(50) DEFAULT 'ai_chat',
  `research_report_url` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `follow_up_status` VARCHAR(50) DEFAULT 'new',
  `follow_up_notes` TEXT,
  `follow_up_at` DATETIME,
  `assigned_to` VARCHAR(100),
  `conversation_summary` TEXT,
  `needs_human` VARCHAR(20) DEFAULT 'auto',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 统计表
CREATE TABLE IF NOT EXISTS `stats` (
  `id` INT PRIMARY KEY,
  `insights_generated` INT DEFAULT 0,
  `leads_captured` INT DEFAULT 0,
  `active_sessions` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息表
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` VARCHAR(36) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_messages_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 访客表
CREATE TABLE IF NOT EXISTS `visitors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` VARCHAR(36) NOT NULL,
  `page` VARCHAR(255) DEFAULT '/',
  `ip` VARCHAR(50),
  `user_agent` TEXT,
  `visited_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_visitors_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 活动日志表
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event` VARCHAR(255) NOT NULL,
  `detail` TEXT,
  `level` VARCHAR(20) DEFAULT 'info',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 案例表
CREATE TABLE IF NOT EXISTS `cases` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `industry` VARCHAR(100),
  `scenario` VARCHAR(255),
  `challenge` TEXT,
  `solution` TEXT,
  `result` TEXT,
  `tags` TEXT,
  `cover_emoji` VARCHAR(10) DEFAULT '💼',
  `published` BOOLEAN DEFAULT true,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化统计数据
INSERT IGNORE INTO `stats` (`id`, `insights_generated`, `leads_captured`, `active_sessions`)
VALUES (1, 0, 0, 0);

-- 初始化案例数据
INSERT IGNORE INTO `cases` (`id`, `title`, `industry`, `scenario`, `challenge`, `solution`, `result`, `tags`, `cover_emoji`) VALUES
('case-001', '智能质检系统', '制造业', '产线质量检验', '传统产线依赖人工目检，漏检率高、效率低，每天需 8 名质检员轮班，人工成本居高不下。', '部署基于计算机视觉的 AI 质检系统，结合工业相机与边缘计算，实现毫秒级缺陷识别与自动分拣。', '漏检率降低 95%，人力成本节省 60%，产线效率提升 3 倍，6 个月内实现 ROI。', '视觉检测,工业AI,边缘计算,降本增效', '🏭'),
('case-002', '智能客服中台', '金融', '客户服务与咨询', '银行日均处理 5000+ 客户咨询，人工坐席排队严重，重复问题占比 70%，客户满意度持续下降。', '构建多轮对话 AI 客服中台，集成知识库与工单系统，实现智能分流与自动应答。', '自动解决率提升至 85%，平均响应时间从 12 分钟降至 30 秒，客户满意度提升 40%。', 'NLP,智能客服,知识库,服务效率', '🏦'),
('case-003', 'AI 辅助研发平台', '软件', '研发效能提升', '200 人研发团队面临代码审查效率低、重复开发严重、新人上手慢等痛点，交付周期长。', '部署 AI 编码助手与智能 Code Review 系统，结合企业知识库实现上下文感知的代码生成与建议。', '代码审查时间缩短 50%，重复代码减少 35%，新人上手时间从 3 个月缩短至 1 个月。', '代码生成,Code Review,研发效能,企业知识库', '💻'),
('case-004', '智能文档处理系统', '法律', '合同审查与合规', '律所每月处理 2000+ 份合同，人工审查平均耗时 4 小时/份，关键条款遗漏风险高。', '基于大语言模型的合同智能审查系统，自动提取关键条款、识别风险点并生成审查报告。', '审查效率提升 10 倍，风险条款识别准确率达 96%，律师可专注于高价值谈判工作。', '文档处理,LLM,合规审查,法律科技', '📋'),
('case-005', '数据驱动运营平台', '电商', '精准营销与用户运营', '电商平台拥有 500 万用户但缺乏精细化运营能力，营销 ROI 低，用户流失率高达 45%。', '构建用户画像与 AI 预测模型，实现千人千面的个性化推荐和精准触达策略。', '营销 ROI 提升 220%，用户留存率从 55% 提升至 78%，GMV 季度环比增长 35%。', '用户画像,推荐系统,精准营销,数据运营', '🛒'),
('case-006', '智慧医疗辅助诊断', '医疗', '影像辅助诊断', '三甲医院放射科日均阅片 800+，医生工作负荷大，基层医院诊断能力不足导致误诊率偏高。', '训练多模态医学影像 AI 模型，辅助医生快速识别病灶、量化分析并生成结构化报告。', '阅片效率提升 4 倍，早期病变检出率提升 30%，基层医院诊断准确率从 75% 提升至 92%。', '医疗AI,影像识别,辅助诊断,智慧医疗', '🏥');
