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

-- 法律页面表（隐私政策、服务条款），后台可维护
CREATE TABLE IF NOT EXISTS `legal_pages` (
  `page_key` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- 初始化法律页面（隐私政策、服务条款），基于互联网/AI 服务行业知识
INSERT IGNORE INTO `legal_pages` (`page_key`, `title`, `content`) VALUES
('privacy', '隐私政策', '# 隐私政策\n\n最后更新日期：2026年8月9日\n\n苏州和毅智能科技有限公司（以下简称“我们”）深知个人信息对您的重要性，我们将按照《中华人民共和国个人信息保护法》《网络安全法》等相关法律法规，保护您的个人信息。本政策适用于您通过本网站及我们的AI智能对话服务与我们的交互。\n\n## 一、我们收集的信息\n\n1. **您主动提供的信息**：在与数字合伙人的对话中，您可能主动提供的姓名、称呼、联系方式（电话、邮箱、微信等）、所在行业、业务需求与痛点描述等。\n2. **自动收集的信息**：当您访问本网站时，我们可能通过Cookie或类似技术自动收集您的访问日志、IP地址、浏览器类型、设备信息、页面浏览行为等。\n3. **对话内容**：您与AI助手的对话文本，用于提供咨询答复、理解需求并改进服务质量。\n\n## 二、我们如何使用信息\n\n1. 为您提供智能咨询与业务解答服务；\n2. 在您留下联系方式后，由我们的业务人员与您联系、跟进需求并提供方案；\n3. 分析与改进我们的产品、服务及AI模型效果；\n4. 保障服务安全、防范欺诈与滥用。\n\n我们不会将您的个人信息用于本政策未载明的其他用途。\n\n## 三、第三方服务\n\n为提供AI对话能力，我们可能将您的对话内容传输至第三方大模型服务提供商（如智谱AI）进行语义理解与回复生成。我们要求第三方在处理过程中遵守保密与数据安全义务。我们可能使用第三方统计分析服务以了解网站使用情况。\n\n## 四、信息共享与披露\n\n除以下情形外，我们不会向第三方共享或披露您的个人信息：\n1. 获得您的明确同意；\n2. 为完成您要求的业务跟进而必要；\n3. 法律法规要求或行政、司法机关依法要求。\n\n## 五、信息安全\n\n我们采取合理的技术与管理措施（如访问控制、加密传输）保护您的信息安全，但请理解，互联网传输不存在绝对安全。\n\n## 六、您的权利\n\n您有权访问、更正、删除您的个人信息，或撤回授权。如需行使上述权利，请通过本政策末尾的联系方式与我们联系。\n\n## 七、未成年人\n\n本网站面向企业客户与成年用户。若您是未满18周岁的未成年人，请在监护人陪同下使用并勿主动提供个人信息。\n\n## 八、政策更新\n\n我们可能适时修订本政策，更新后将在本页面公示。重大变更将通过网站公告或合理方式告知您。\n\n## 九、联系我们\n\n如对本政策有任何疑问，请联系：chenqinsi@hitech.xin。'),
('terms', '服务条款', '# 服务条款\n\n最后更新日期：2026年8月9日\n\n欢迎访问苏州和毅智能科技有限公司（以下简称“我们”）运营的网站及AI智能对话服务。请您在使用前仔细阅读本服务条款，使用即视为您已理解并同意本条款。\n\n## 一、服务说明\n\n我们通过网站为您提供AI智能咨询、业务需求沟通、案例展示及相关信息服务。对话内容由AI模型生成，可能存在不准确或不完善之处，仅供您参考，不构成专业意见或承诺。\n\n## 二、接受条款\n\n您访问或使用本网站及服务，即表示您同意受本条款约束。若您不同意任一条款，请停止使用。\n\n## 三、用户行为规范\n\n您承诺不利用本服务从事以下行为：\n1. 发布或传输违法、侵权、欺诈、骚扰或破坏性内容；\n2. 冒用他人身份或提供虚假信息；\n3. 以任何方式干扰、破坏服务正常运行或试图未授权访问；\n4. 试图通过技术手段逆向工程、抓取大量数据或攻击系统。\n\n## 四、知识产权\n\n本网站的文本、图片、标识、案例、软件等内容的知识产权归我们或相关权利人所有，未经书面许可不得复制、转载、传播或用于商业用途。您在对话中提供的内容，您享有权利并授权我们为提供服务与改进之目的进行使用。\n\n## 五、免责声明\n\n1. AI生成内容可能存在错误，我们不对其准确性、完整性作保证，您应自行判断；\n2. 因网络故障、系统维护、第三方服务中断等原因导致服务不可用，我们不承担由此造成的损失；\n3. 本网站可能包含指向第三方的链接，我们对第三方内容与服务不承担责任。\n\n## 六、责任限制\n\n在法律允许的范围内，因使用本服务产生的任何直接或间接损失，我们的责任以实际收到的服务费用为限；若您未支付费用，则不承担赔偿责任。\n\n## 七、服务变更与终止\n\n我们可随时变更、暂停或终止部分或全部服务，并将尽量提前公告。若您违反本条款，我们有权限制或终止对您的服务。\n\n## 八、争议解决与适用法律\n\n本条款的解释与争议适用中华人民共和国法律。因本条款或服务产生的争议，双方应友好协商；协商不成的，可向我们住所地有管辖权的人民法院提起诉讼。\n\n## 九、联系方式\n\n如有任何疑问，请联系：chenqinsi@hitech.xin。');
