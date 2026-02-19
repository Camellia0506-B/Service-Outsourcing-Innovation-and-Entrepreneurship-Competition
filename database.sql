-- 建库（存在则不重复创建）
CREATE DATABASE IF NOT EXISTS gradquest
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

-- 2) 建用户（只允许本机）
CREATE USER IF NOT EXISTS 'gradquest'@'localhost'
  IDENTIFIED WITH mysql_native_password BY 'Gradquest123!';

-- 3) 授权
GRANT ALL PRIVILEGES ON gradquest.* TO 'gradquest'@'localhost';
FLUSH PRIVILEGES;

USE gradquest;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 先删表（按依赖顺序删也行，但关闭外键检查就无所谓）
DROP TABLE IF EXISTS assessment_reports;
DROP TABLE IF EXISTS assessment_submissions;
DROP TABLE IF EXISTS resume_parse_tasks;
DROP TABLE IF EXISTS profile_awards;
DROP TABLE IF EXISTS profile_projects;
DROP TABLE IF EXISTS profile_internships;
DROP TABLE IF EXISTS profile_certificates;
DROP TABLE IF EXISTS profile_skills;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS forum_comments;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS shared_resources;
DROP TABLE IF EXISTS camp_notices;
DROP TABLE IF EXISTS user_follows;
DROP TABLE IF EXISTS app_daily_content;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS universities;

-- 1. 高校基本信息表
CREATE TABLE universities (
  id        INT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  name      VARCHAR(100) NOT NULL COMMENT '高校名称',
  logo_url  VARCHAR(255) NULL COMMENT '校徽图片链接(OSS地址)',
  intro     TEXT NULL COMMENT '高校简介(用于卡片展示)',
  tags      VARCHAR(255) NULL COMMENT '院校标签(逗号分隔)，用于筛选',
  PRIMARY KEY (id),
  KEY idx_universities_name (name),
  KEY idx_universities_tags (tags)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='高校基本信息';

-- 6. 用户表
CREATE TABLE users (
  id         BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  username   VARCHAR(50) NOT NULL COMMENT '用户名/账号',
  password   VARCHAR(255) NOT NULL COMMENT '密码(BCrypt 哈希)',
  nickname   VARCHAR(50) NULL COMMENT '昵称(显示在帖子中)',
  avatar     VARCHAR(255) NULL COMMENT '头像链接',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户';

-- 2. 招生通知表
CREATE TABLE camp_notices (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  univ_id     INT NOT NULL COMMENT '外键，关联 universities.id',
  dept_name   VARCHAR(100) NULL COMMENT '学院名称',
  title       VARCHAR(255) NOT NULL COMMENT '通知标题',
  content     TEXT NULL COMMENT '通知正文(纯文本或HTML)',
  end_date    DATETIME NULL COMMENT '截止日期(排序/筛选)',
  source_link TEXT NULL COMMENT '原文链接(跳转官网用)',
  PRIMARY KEY (id),
  KEY idx_camp_notices_univ_id (univ_id),
  KEY idx_camp_notices_end_date (end_date),
  CONSTRAINT fk_camp_notices_univ
    FOREIGN KEY (univ_id) REFERENCES universities(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='招生通知';

-- 3. 经验帖子表
CREATE TABLE forum_posts (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  univ_id     INT NOT NULL COMMENT '外键，关联 universities.id',
  user_id     BIGINT NOT NULL COMMENT '外键，关联 users.id',
  title       VARCHAR(100) NOT NULL COMMENT '帖子标题',
  content     TEXT NULL COMMENT '帖子内容(支持Markdown)',
  reply_count INT NOT NULL DEFAULT 0 COMMENT '评论/回复总数，默认为0',
  view_count  INT NOT NULL DEFAULT 0 COMMENT '浏览量',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  PRIMARY KEY (id),
  KEY idx_forum_posts_univ_id (univ_id),
  KEY idx_forum_posts_user_id (user_id),
  KEY idx_forum_posts_created_at (created_at),
  CONSTRAINT fk_forum_posts_univ
    FOREIGN KEY (univ_id) REFERENCES universities(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_forum_posts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='论坛帖子';

-- 4. 帖子评论表
CREATE TABLE forum_comments (
  id         BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  post_id    BIGINT NOT NULL COMMENT '外键，关联 forum_posts.id',
  user_id    BIGINT NOT NULL COMMENT '外键，关联 users.id',
  content    TEXT NOT NULL COMMENT '评论内容',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
  PRIMARY KEY (id),
  KEY idx_forum_comments_post_id (post_id),
  KEY idx_forum_comments_user_id (user_id),
  KEY idx_forum_comments_created_at (created_at),
  CONSTRAINT fk_forum_comments_post
    FOREIGN KEY (post_id) REFERENCES forum_posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_forum_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='帖子评论';

-- 5. 共享资料表
CREATE TABLE shared_resources (
  id         BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  univ_id    INT NOT NULL COMMENT '外键，关联 universities.id',
  user_id    BIGINT NOT NULL COMMENT '上传者ID',
  file_name  VARCHAR(100) NOT NULL COMMENT '文件显示名称',
  file_url   VARCHAR(255) NOT NULL COMMENT '文件下载地址',
  file_size  VARCHAR(20) NULL COMMENT '文件大小(展示用)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  PRIMARY KEY (id),
  KEY idx_shared_resources_univ_id (univ_id),
  KEY idx_shared_resources_user_id (user_id),
  KEY idx_shared_resources_created_at (created_at),
  CONSTRAINT fk_shared_resources_univ
    FOREIGN KEY (univ_id) REFERENCES universities(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_shared_resources_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='共享资料';

-- 7. 用户关注表
CREATE TABLE user_follows (
  id         BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  user_id    BIGINT NOT NULL COMMENT '外键，关联 users.id',
  univ_id    INT NOT NULL COMMENT '外键，关联 universities.id',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_follows_user_univ (user_id, univ_id),
  KEY idx_user_follows_univ_id (univ_id),
  KEY idx_user_follows_created_at (created_at),
  CONSTRAINT fk_user_follows_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_follows_univ
    FOREIGN KEY (univ_id) REFERENCES universities(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户关注';

-- 8. 每日/全局配置表
CREATE TABLE app_daily_content (
  id       INT NOT NULL COMMENT '主键(固定为1或少量行)',
  date     DATE NOT NULL COMMENT '日期',
  quote    VARCHAR(255) NULL COMMENT '每日一句/祝福语',
  bg_image VARCHAR(255) NULL COMMENT '每日背景图url',
  PRIMARY KEY (id),
  UNIQUE KEY uk_app_daily_content_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='每日/全局配置';

-- 9. 个人档案扩展表（与 users 1:1，basic + education）
CREATE TABLE user_profiles (
  user_id              BIGINT NOT NULL COMMENT '用户ID，关联 users.id',
  gender               VARCHAR(10) NULL COMMENT '性别',
  birth_date           DATE NULL COMMENT '出生日期',
  phone                VARCHAR(20) NULL COMMENT '手机号',
  email                VARCHAR(100) NULL COMMENT '邮箱',
  school               VARCHAR(100) NULL COMMENT '学校',
  major                VARCHAR(100) NULL COMMENT '专业',
  degree               VARCHAR(50) NULL COMMENT '学历',
  grade                VARCHAR(50) NULL COMMENT '年级',
  expected_graduation  VARCHAR(20) NULL COMMENT '预计毕业时间',
  gpa                  VARCHAR(20) NULL COMMENT 'GPA',
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '档案更新时间',
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='个人档案扩展';

-- 10. 档案-技能（按分类）
CREATE TABLE profile_skills (
  id       BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  user_id  BIGINT NOT NULL COMMENT '用户ID',
  category VARCHAR(50) NOT NULL COMMENT '技能分类',
  items    JSON NOT NULL COMMENT '技能项列表',
  PRIMARY KEY (id),
  KEY idx_profile_skills_user_id (user_id),
  CONSTRAINT fk_profile_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='档案-技能';

-- 11. 档案-证书
CREATE TABLE profile_certificates (
  id         BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  user_id    BIGINT NOT NULL COMMENT '用户ID',
  name       VARCHAR(200) NOT NULL COMMENT '证书名称',
  issue_date VARCHAR(20) NULL COMMENT '颁发日期',
  cert_url   VARCHAR(500) NULL COMMENT '证书文件URL',
  PRIMARY KEY (id),
  KEY idx_profile_certificates_user_id (user_id),
  CONSTRAINT fk_profile_certificates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='档案-证书';

-- 12. 档案-实习经历
CREATE TABLE profile_internships (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  user_id     BIGINT NOT NULL COMMENT '用户ID',
  company     VARCHAR(100) NOT NULL COMMENT '公司',
  position    VARCHAR(100) NULL COMMENT '职位',
  start_date  VARCHAR(20) NULL COMMENT '开始日期',
  end_date    VARCHAR(20) NULL COMMENT '结束日期',
  description TEXT NULL COMMENT '描述',
  PRIMARY KEY (id),
  KEY idx_profile_internships_user_id (user_id),
  CONSTRAINT fk_profile_internships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='档案-实习经历';

-- 13. 档案-项目经历
CREATE TABLE profile_projects (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  user_id     BIGINT NOT NULL COMMENT '用户ID',
  name        VARCHAR(200) NOT NULL COMMENT '项目名称',
  role        VARCHAR(100) NULL COMMENT '角色',
  start_date  VARCHAR(20) NULL COMMENT '开始日期',
  end_date    VARCHAR(20) NULL COMMENT '结束日期',
  description TEXT NULL COMMENT '描述',
  tech_stack  JSON NULL COMMENT '技术栈列表',
  PRIMARY KEY (id),
  KEY idx_profile_projects_user_id (user_id),
  CONSTRAINT fk_profile_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='档案-项目经历';

-- 14. 档案-获奖
CREATE TABLE profile_awards (
  id     BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  name   VARCHAR(200) NOT NULL COMMENT '奖项名称',
  level  VARCHAR(50) NULL COMMENT '级别',
  date   VARCHAR(20) NULL COMMENT '获奖日期',
  PRIMARY KEY (id),
  KEY idx_profile_awards_user_id (user_id),
  CONSTRAINT fk_profile_awards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='档案-获奖';

-- 15. 简历解析任务（上传简历后生成，用于拉取解析结果）
CREATE TABLE resume_parse_tasks (
  id               BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id          VARCHAR(80) NOT NULL COMMENT '业务任务ID，如 resume_parse_20260214_10001',
  user_id          BIGINT NOT NULL COMMENT '用户ID',
  status           VARCHAR(20) NOT NULL DEFAULT 'processing' COMMENT 'processing/completed/failed',
  parsed_data      JSON NULL COMMENT '解析结果',
  confidence_score DECIMAL(3,2) NULL COMMENT '置信度 0-1',
  suggestions      JSON NULL COMMENT '建议列表',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_resume_parse_tasks_task_id (task_id),
  KEY idx_resume_parse_tasks_user_id (user_id),
  CONSTRAINT fk_resume_parse_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='简历解析任务';

-- 16. 职业测评答卷（提交测评答案）
CREATE TABLE assessment_submissions (
  id              BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  assessment_id   VARCHAR(80) NOT NULL COMMENT '测评ID，如 assess_20260214_10001',
  user_id         BIGINT NOT NULL COMMENT '用户ID',
  assessment_type VARCHAR(30) NOT NULL COMMENT 'comprehensive/quick',
  answers         JSON NOT NULL COMMENT '答题内容',
  time_spent      INT NULL COMMENT '耗时（分钟）',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_assessment_submissions_assessment_id (assessment_id),
  KEY idx_assessment_submissions_user_id (user_id),
  CONSTRAINT fk_assessment_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='职业测评答卷';

-- 17. 职业测评报告（生成结果）
CREATE TABLE assessment_reports (
  id              BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  report_id       VARCHAR(80) NOT NULL COMMENT '报告ID，如 report_20260214_10001',
  user_id         BIGINT NOT NULL COMMENT '用户ID',
  assessment_id   VARCHAR(80) NOT NULL COMMENT '测评ID',
  status          VARCHAR(20) NOT NULL DEFAULT 'processing' COMMENT 'processing/completed/failed',
  assessment_date DATE NULL COMMENT '测评日期',
  report_data     JSON NULL COMMENT '报告内容（完整 JSON）',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_assessment_reports_report_id (report_id),
  KEY idx_assessment_reports_user_id (user_id),
  KEY idx_assessment_reports_assessment_id (assessment_id),
  CONSTRAINT fk_assessment_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='职业测评报告';

SET FOREIGN_KEY_CHECKS = 1;

ALTER USER 'gradquest'@'localhost'
  IDENTIFIED WITH mysql_native_password BY 'Gradquest123!';
FLUSH PRIVILEGES;

-- universities
INSERT INTO universities (id,name,logo_url,intro,tags) VALUES
  (1,'清华大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/清华大学.jpg','清华大学，依托智能产业研究院，聚焦TOP2，提供科研实践与创新培养。','TOP2'),
  (2,'香港中文大学（深圳）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/香港中文大学（深圳）.jpg','香港中文大学（深圳），依托数据科学学院，聚焦港三，提供科研实践与创新培养。','港三'),
  (3,'中国科学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','中国科学院，依托空天信息创新研究院，聚焦研究院，提供科研实践与创新培养。','研究院'),
  (4,'北京大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京大学.jpg','北京大学，依托前沿交叉学科研究院，聚焦TOP2，提供科研实践与创新培养。','TOP2'),
  (5,'香港科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/香港科技大学.jpg','香港科技大学，依托计算机科学与工程系，聚焦港三，提供科研实践与创新培养。','港三'),
  (6,'香港科技大学（广州）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/香港科技大学（广州）.jpg','香港科技大学（广州），依托未来技术学院，聚焦港三，提供科研实践与创新培养。','港三'),
  (7,'香港中文大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/香港中文大学.jpg','香港中文大学，依托计算机科学与工程系，聚焦港三，提供科研实践与创新培养。','港三'),
  (8,'上海创智学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','上海创智学院，依托上海创智学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (9,'南方科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南方科技大学.jpg','南方科技大学，依托系统设计与智能制造学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (10,'西湖大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西湖大学.jpg','西湖大学，依托工学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (11,'上海交通大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海交通大学.jpg','上海交通大学，依托密西根学院，聚焦华五，提供科研实践与创新培养。','华五'),
  (12,'南京大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京大学.jpg','南京大学，依托南大AI lamda实验室，聚焦华五，提供科研实践与创新培养。','华五'),
  (13,'哈尔滨工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/哈尔滨工业大学.jpg','哈尔滨工业大学，依托计算学部，聚焦C9,985,211，提供科研实践与创新培养。','C9,985,211'),
  (14,'上海科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海科技大学.jpg','上海科技大学，依托信息科学与技术学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (15,'上海AILAB','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','上海AILAB，依托上海AILAB，聚焦联培，提供科研实践与创新培养。','联培'),
  (16,'同济大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/同济大学.jpg','同济大学，依托计算机科学与技术学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (17,'中山大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中山大学.jpg','中山大学，依托软件工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (18,'东北师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/东北师范大学.jpg','东北师范大学，依托信息科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (19,'浙江大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/浙江大学.jpg','浙江大学，依托信电学院，聚焦华五，提供科研实践与创新培养。','华五'),
  (20,'哈尔滨工业大学深圳校区','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/哈尔滨工业大学.jpg','哈尔滨工业大学深圳校区，依托信息学部计算机科学与技术学院，聚焦C9，提供科研实践与创新培养。','C9'),
  (21,'中国科学院大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','中国科学院大学，依托前沿交叉科学学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (22,'西安交通大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西安交通大学.jpg','西安交通大学，依托自动化科学与工程学院，聚焦C9，提供科研实践与创新培养。','C9'),
  (23,'北京中关村学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','北京中关村学院，依托北京中关村学院，聚焦联培，提供科研实践与创新培养。','联培'),
  (24,'厦门大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/厦门大学.jpg','厦门大学，依托信息学院(特色化示范性软件学院），聚焦985,211，提供科研实践与创新培养。','985,211'),
  (25,'北京师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京师范大学.jpg','北京师范大学，依托文理学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (26,'应用物理与计算数学研究所','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','应用物理与计算数学研究所，依托应用物理与计算数学研究所，聚焦研究院，提供科研实践与创新培养。','研究院'),
  (27,'吉林大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/吉林大学.jpg','吉林大学，依托软件学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (28,'中国地质大学（武汉）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国地质大学（武汉）.jpg','中国地质大学（武汉），依托地理与信息工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (29,'上海财经大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海财经大学.jpg','上海财经大学，依托计算机与人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (30,'复旦大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/复旦大学.jpg','复旦大学，依托大数据学院，聚焦华五，提供科研实践与创新培养。','华五'),
  (31,'山东大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山东大学.jpg','山东大学，依托软件学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (32,'北京理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京理工大学.jpg','北京理工大学，依托空天网信所，聚焦985，提供科研实践与创新培养。','985'),
  (33,'兰州大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/兰州大学.jpg','兰州大学，依托信息科学与工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (34,'湖南科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/湖南科技大学.jpg','湖南科技大学，依托计算机科学与工程学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (35,'上海理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海理工大学.jpg','上海理工大学，依托光电信息与计算机工程学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (36,'南京航空航天大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京航空航天大学.jpg','南京航空航天大学，依托计算机科学与技术学院/软件学院实验室开放日，聚焦211，提供科研实践与创新培养。','211'),
  (37,'华中师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华中师范大学.jpg','华中师范大学，依托人工智能教育学部，聚焦211，提供科研实践与创新培养。','211'),
  (38,'北京通用人工智能研究院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','北京通用人工智能研究院，依托北京通用人工智能研究院，聚焦联培，提供科研实践与创新培养。','联培'),
  (39,'深圳大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/深圳大学.jpg','深圳大学，依托计算机与软件学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (40,'华东师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华东师范大学.jpg','华东师范大学，依托软件工程学院，聚焦985，提供科研实践与创新培养。','985'),
  (41,'北京交通大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京交通大学.jpg','北京交通大学，依托电子信息工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (42,'南开大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南开大学.jpg','南开大学，依托人工智能学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (43,'华东理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华东理工大学.jpg','华东理工大学，依托信息科学与工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (44,'暨南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/暨南大学.jpg','暨南大学，依托信息科学技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (45,'华中科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华中科技大学.jpg','华中科技大学，依托网络空间安全学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (46,'北京航空航天大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京航空航天大学.jpg','北京航空航天大学，依托软件学院，聚焦985，提供科研实践与创新培养。','985'),
  (47,'中国人民大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国人民大学.jpg','中国人民大学，依托信息学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (48,'火箭军工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/火箭军工程大学.jpg','火箭军工程大学，依托一二三院，聚焦四非，提供科研实践与创新培养。','四非'),
  (49,'中国科学技术大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学技术大学.jpg','中国科学技术大学，依托网络空间与信息安全学院，聚焦985,211,华五,C9，提供科研实践与创新培养。','985,211,华五,C9'),
  (50,'电子科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/电子科技大学.jpg','电子科技大学，依托计算机（网安）学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (51,'四川大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/四川大学.jpg','四川大学，依托计算机学院（软件学院、智能科学与技术学院），聚焦985,211，提供科研实践与创新培养。','985,211'),
  (52,'河海大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/河海大学.jpg','河海大学，依托计算机与软件学院，聚焦211，提供科研实践与创新培养。','211'),
  (53,'西南交通大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西南交通大学.jpg','西南交通大学，依托计算机与人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (54,'武汉大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/武汉大学.jpg','武汉大学，依托人工智能学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (55,'山东农业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山东农业大学.jpg','山东农业大学，依托信息科学与工程学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (56,'北京林业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京林业大学.jpg','北京林业大学，依托工学院，聚焦211，提供科研实践与创新培养。','211'),
  (57,'上海体育大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海体育大学.jpg','上海体育大学，依托心理学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (58,'首都体育学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/首都体育学院.jpg','首都体育学院，依托体育人工智能研究院，聚焦四非，提供科研实践与创新培养。','四非'),
  (59,'北京信息科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京信息科技大学.jpg','北京信息科技大学，依托电子信息类的5个学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (60,'江南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/江南大学.jpg','江南大学，依托机械工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (61,'北京邮电大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京邮电大学.jpg','北京邮电大学，依托电子工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (62,'南京师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京师范大学.jpg','南京师范大学，依托计算机与电子信息学院/人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (63,'江西财经大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/江西财经大学.jpg','江西财经大学，依托计算机与人工智能学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (64,'天津大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/天津大学.jpg','天津大学，依托宣怀学院，聚焦985,211,联培，提供科研实践与创新培养。','985,211,联培'),
  (65,'哈尔滨工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/哈尔滨工程大学.jpg','哈尔滨工程大学，依托智能科学与工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (66,'东南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/东南大学.jpg','东南大学，依托网络空间安全学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (67,'西北工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西北工业大学.jpg','西北工业大学，依托无人系统技术研究院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (68,'西北农林科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西北农林科技大学.jpg','西北农林科技大学，依托信息工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (69,'山西大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山西大学.jpg','山西大学，依托自动化与软件学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (70,'中南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中南大学.jpg','中南大学，依托计算机学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (71,'东华大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/东华大学.jpg','东华大学，依托信息科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (72,'东北大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/东北大学.jpg','东北大学，依托机器人科学与工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (73,'中国科学院计算技术研究所','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','中国科学院计算技术研究所，依托中国科学院计算技术研究所，聚焦研究院,双非，提供科研实践与创新培养。','研究院,双非'),
  (74,'北京建筑大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京建筑大学.jpg','北京建筑大学，依托智能科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (75,'苏州大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/苏州大学.jpg','苏州大学，依托计算机科学与技术学院（软件学院），聚焦211，提供科研实践与创新培养。','211'),
  (76,'国防科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','国防科技大学，依托智能科学学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (77,'首都医科大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/首都医科大学.jpg','首都医科大学，依托生物医学工程学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (78,'北京科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京科技大学.jpg','北京科技大学，依托计算机与通信工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (79,'中国人民解放军军事科学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','中国人民解放军军事科学院，依托军事科学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (80,'中国民用航空飞行学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国民用航空飞行学院.jpg','中国民用航空飞行学院，依托空中交通管理学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (81,'哈尔滨工业大学（威海）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/哈尔滨工业大学（威海）.jpg','哈尔滨工业大学（威海），依托计算机科学与技术学院，聚焦985,211,C9，提供科研实践与创新培养。','985,211,C9'),
  (82,'中国农业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国农业大学.jpg','中国农业大学，依托信息与电气工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (83,'大连理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/大连理工大学.jpg','大连理工大学，依托计算机科学与技术，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (84,'南京理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京理工大学.jpg','南京理工大学，依托网络空间安全学院，聚焦211，提供科研实践与创新培养。','211'),
  (85,'西安电子科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西安电子科技大学.jpg','西安电子科技大学，依托计算机科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (86,'中国海洋大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国海洋大学.jpg','中国海洋大学，依托崂山国家实验室，聚焦985,211,联培，提供科研实践与创新培养。','985,211,联培'),
  (87,'华北电力大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华北电力大学.jpg','华北电力大学，依托控制与计算机工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (88,'南京邮电大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京邮电大学.jpg','南京邮电大学，依托物联网学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (89,'云南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/云南大学.jpg','云南大学，依托信息学院，聚焦211，提供科研实践与创新培养。','211'),
  (90,'北京协和医学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京协和医学院.jpg','北京协和医学院，依托医学信息研究所，聚焦双非，提供科研实践与创新培养。','双非'),
  (91,'哈尔滨工业大学（深圳）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/哈尔滨工业大学（深圳）.jpg','哈尔滨工业大学（深圳），依托空天科技学院，聚焦985,211,C9，提供科研实践与创新培养。','985,211,C9'),
  (92,'中国人民公安大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国人民公安大学.jpg','中国人民公安大学，依托非公安学科，聚焦双非，提供科研实践与创新培养。','双非'),
  (93,'合肥工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/合肥工业大学.jpg','合肥工业大学，依托计算机与信息学院，聚焦211，提供科研实践与创新培养。','211'),
  (94,'中央民族大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中央民族大学.jpg','中央民族大学，依托信息工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (95,'航天工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','航天工程大学，依托入伍，聚焦四非，提供科研实践与创新培养。','四非'),
  (96,'军事科学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','军事科学院，依托入伍，聚焦四非，提供科研实践与创新培养。','四非'),
  (97,'空军预警学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/空军预警学院.jpg','空军预警学院，依托入伍，聚焦四非，提供科研实践与创新培养。','四非'),
  (98,'重庆大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/重庆大学.jpg','重庆大学，依托ALL，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (99,'北京语言大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京语言大学.jpg','北京语言大学，依托信息科学学院暨语言智能研究院，聚焦四非，提供科研实践与创新培养。','四非'),
  (100,'空军工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','空军工程大学，依托入伍，聚焦四非，提供科研实践与创新培养。','四非'),
  (101,'武警工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/武警工程大学.jpg','武警工程大学，依托入伍，聚焦四非，提供科研实践与创新培养。','四非'),
  (102,'湖南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/湖南大学.jpg','湖南大学，依托信息科学与工程学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (103,'中南财经政法大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中南财经政法大学.jpg','中南财经政法大学，依托信息工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (104,'宁波东方理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','宁波东方理工大学，依托上海交通大学，聚焦联培,四非,985,211,C9,华五，提供科研实践与创新培养。','联培,四非,985,211,C9,华五'),
  (105,'陕西师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/陕西师范大学.jpg','陕西师范大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (106,'广西大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/广西大学.jpg','广西大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (107,'中国石油大学(北京)','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国石油大学（北京）.jpg','中国石油大学(北京)，依托人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (108,'重庆邮电大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/重庆邮电大学.jpg','重庆邮电大学，依托人工智能学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (109,'天津理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/天津理工大学.jpg','天津理工大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (110,'长安大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/长安大学.jpg','长安大学，依托电子与控制工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (111,'山东师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山东师范大学.jpg','山东师范大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (112,'海南医科大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/海南医科大学.jpg','海南医科大学，依托智能医学与技术学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (113,'湖南工商大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/湖南工商大学.jpg','湖南工商大学，依托计算机学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (114,'上海海事大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海海事大学.jpg','上海海事大学，依托信息工程学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (115,'成都信息工程大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/成都信息工程大学.jpg','成都信息工程大学，依托计算机学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (116,'中国传媒大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国传媒大学.jpg','中国传媒大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (117,'山东大学（威海）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山东大学（威海）.jpg','山东大学（威海），依托空间科学与技术学院，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (118,'曲阜师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/曲阜师范大学.jpg','曲阜师范大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (119,'南京林业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京林业大学.jpg','南京林业大学，依托信息科学技术、人工智能学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (120,'西南大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/西南大学.jpg','西南大学，依托人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (121,'广东工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/广东工业大学.jpg','广东工业大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (122,'南昌大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南昌大学.jpg','南昌大学，依托信息工程学院，聚焦211，提供科研实践与创新培养。','211'),
  (123,'北京电子科技学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京电子科技学院.jpg','北京电子科技学院，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (124,'苏州科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/苏州科技大学.jpg','苏州科技大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (125,'辽宁大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/辽宁大学.jpg','辽宁大学，依托信息学部，聚焦211，提供科研实践与创新培养。','211'),
  (126,'中央财经大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中央财经大学.jpg','中央财经大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (127,'北京理工大学（珠海）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京理工大学.jpg','北京理工大学（珠海），依托ALL，聚焦985,211，提供科研实践与创新培养。','985,211'),
  (128,'北京化工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北京化工大学.jpg','北京化工大学，依托信息科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (129,'河北工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/河北工业大学.jpg','河北工业大学，依托人工智能与数据科学学院，聚焦211，提供科研实践与创新培养。','211'),
  (130,'中国地质大学（北京）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国地质大学（北京）.jpg','中国地质大学（北京），依托人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (131,'中国科学院大学杭州高等研究院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','中国科学院大学杭州高等研究院，依托智能科学与技术学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (132,'中国矿业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国矿业大学.jpg','中国矿业大学，依托计算机科学与技术学院/人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (133,'中国石油大学（华东）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国石油大学（华东）.jpg','中国石油大学（华东），依托青岛软件学院、计算机科学与技术学院，聚焦211，提供科研实践与创新培养。','211'),
  (134,'南通大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南通大学.jpg','南通大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (135,'首都师范大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/首都师范大学.jpg','首都师范大学，依托信息工程学院，聚焦双非，提供科研实践与创新培养。','双非'),
  (136,'华北计算机系统工程研究所','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','华北计算机系统工程研究所，依托华北计算机系统工程研究所，聚焦研究院，提供科研实践与创新培养。','研究院'),
  (137,'山东第一医科大学（山东省医学科学院）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中国科学院大学.jpg','山东第一医科大学（山东省医学科学院），依托医学信息与人工智能学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (138,'中央音乐学院','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/中央音乐学院.jpg','中央音乐学院，依托人工智能与音乐信息科技方向，聚焦211，提供科研实践与创新培养。','211'),
  (139,'华北电力大学（保定）','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华北电力大学.jpg','华北电力大学（保定），依托计算机系，聚焦211，提供科研实践与创新培养。','211'),
  (140,'上海大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/上海大学.jpg','上海大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (141,'华中农业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/华中农业大学.jpg','华中农业大学，依托信息学院，聚焦211，提供科研实践与创新培养。','211'),
  (142,'南京财经大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/南京财经大学.jpg','南京财经大学，依托计算机与人工智能学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (143,'武汉理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/武汉理工大学.jpg','武汉理工大学，依托ALL，聚焦211，提供科研实践与创新培养。','211'),
  (144,'福州大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/福州大学.jpg','福州大学，依托计算机与大数据学院软件学院，聚焦211，提供科研实践与创新培养。','211'),
  (145,'内蒙古大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/内蒙古大学.jpg','内蒙古大学，依托计算机学院（软件学院）、人工智能学院，聚焦211，提供科研实践与创新培养。','211'),
  (146,'青岛大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/青岛大学.jpg','青岛大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非'),
  (147,'北方工业大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/北方工业大学.jpg','北方工业大学，依托人工智能与计算机学院，聚焦四非，提供科研实践与创新培养。','四非'),
  (148,'郑州大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/郑州大学.jpg','郑州大学，依托计算机与人工智能学院、软件学院，聚焦211，提供科研实践与创新培养。','211'),
  (149,'太原理工大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/太原理工大学.jpg','太原理工大学，依托计算机科学与技术学院（大数据学院），聚焦211，提供科研实践与创新培养。','211'),
  (150,'山东科技大学','https://gardquest.obs.cn-north-4.myhuaweicloud.com/university_logos/山东科技大学.jpg','山东科技大学，依托ALL，聚焦四非，提供科研实践与创新培养。','四非');

-- camp_notices
INSERT INTO camp_notices (univ_id,dept_name,title,content,end_date,source_link) VALUES
  (1,'智能产业研究院','智能产业研究院','冬令营（寒假期间进行的科研实习）','2025-01-10 00:00:00','https://air.tsinghua.edu.cn/info/1007/2129.htm'),
  (2,'数据科学学院','数据科学学院','第一轮2025年3月1日-2025年4月30日，第二轮2025年5月1日-2025年6月20日','2025-04-30 00:00:00','https://sds.cuhk.edu.cn/article/2110'),
  (3,'空天信息创新研究院','空天信息创新研究院','预推免','2025-09-28 00:00:00','https://mp.weixin.qq.com/s/OeP0gBqMUcYy0bs1Unsaxg'),
  (4,'前沿交叉学科研究院','前沿交叉学科研究院','_No response_','2025-06-12 08:00:00','http://www.aais.pku.edu.cn/tongzhi/shownews.php?lang=cn&id=1860'),
  (1,'统计与数据科学系','统计与数据科学系','_No response_','2025-04-16 17:00:00','https://mp.weixin.qq.com/s/XyUje2eDmgxKKwfP9p5iYw'),
  (4,'统计科学中心','统计科学中心','_No response_','2025-04-28 00:00:00','https://mp.weixin.qq.com/s/B6gyFmMOuvaBKR-dvSJBhA'),
  (1,'交叉信息学院','交叉信息学院','_No response_','2025-05-05 17:00:00','https://admission.iiis.tsinghua.edu.cn/appinfo.php'),
  (1,'智能与网络化系统研究中心','智能与网络化系统研究中心','_No response_','2025-04-26 00:00:00','https://cfins.au.tsinghua.edu.cn/'),
  (5,'计算机科学与工程系','计算机科学与工程系','优秀者夏天就可以发offer，按照往年最早六月初就可以拿到，只要联系老师即可','2025-08-15 00:00:00','https://cse.hkust.edu.hk/pg/admissions/recruiting/'),
  (6,'未来技术学院','未来技术学院','2025年4月16日-2025年5月30日报名，本校全日制研究型硕士研究生均可获得全额奖学金，金额为人民币10,000元/月（最多24个月）','2025-05-31 00:00:00','https://mp.weixin.qq.com/s?__biz=Mzg3MzgyNjE1Mg==&mid=2247507597&idx=1&sn=ab9c9772f14fa3509d5a1d4befd413a2&chksm=cf0a5a7d39550581cee50122d06cb60bead0b331df24ffc55e8c2a7e68a643c96e1540ef15ed&mpshare=1&scene=23&srcid=0416JjDBmY3EmtA173mM7n6G&sharer_shareinfo=7b5927e20b231ae3be8d7503e4e03f6c&sharer_shareinfo_first=6c8c1c8a17f49dc0e3c0e15d1481fe8f#rd'),
  (7,'计算机科学与工程系','计算机科学与工程系','第一轮2025年4月1日-2025年5月22日，第二轮2025年5月23日-2025年6月24日','2025-06-25 00:00:00','https://www.cse.cuhk.edu.hk/admission/mphil-phd/early-admission/'),
  (4,'信息工程学院','信息工程学院','深圳研究生院','2025-06-20 23:59:00','https://www.ece.pku.edu.cn/info/1027/2923.htm'),
  (8,'上海创智学院','上海创智学院','上海创智学院简介：https://mp.weixin.qq.com/s/EhNPj5JHPGTaxFS7hYDiQQ
上海创智学院考试大纲：https://admissions.sii.edu.cn/
上海创智学院夏令营报名：https://admissions.sii.edu.cn/recruit_students/login','2025-05-08 00:00:00','https://admissions.sii.edu.cn/recruit_students/login'),
  (7,'工程学院系统工程与工程管理系（SEEM）','工程学院系统工程与工程管理系（SEEM）','香港中文大学工程学院系统工程与工程管理系（SEEM）将举办2025年博士生夏令营
香港中文大学工程学院系统工程与工程管理学系（SEEM）将举办2025年博士生夏令营。夏令营举办时间：2025年7月2日（周三）– 4日（周五）夏令营申请截止时间：2025年6月15日（周日）夏令营申请链接：https://cloud.itsc.cuhk.edu.hk/webform/view.php?id=13708578','2025-06-15 00:00:00','https://mp.weixin.qq.com/s/fjdB4MObC4oSmolODrtuVg'),
  (9,'系统设计与智能制造学院','系统设计与智能制造学院','_No response_','2025-06-16 23:00:00','https://sdim.sustech.edu.cn/index/show?id=464'),
  (10,'工学院','工学院','预推免','2025-09-01 10:00:00','https://engineering.westlake.edu.cn/Admission/GraduateProgram/zszx_2623/202508/t20250808_57305.shtml'),
  (4,'工学院','工学院','_No response_','2025-06-05 08:30:00','https://www.coe.pku.edu.cn/graduate/13490.html'),
  (11,'密西根学院','密西根学院','_No response_','2025-06-23 00:00:00','https://ga.sjtu.edu.cn/zsgl/xxgs/xlyhdbfmx.aspx'),
  (12,'南大AI lamda实验室','南大AI lamda实验室','_No response_','2025-06-01 00:00:00','https://www.lamda.nju.edu.cn/recruit-2026/recruit-2026.html'),
  (13,'计算学部','计算学部','面试时间将在审核通过后，根据报名情况适时安排。面试形式、地点以通知为准','2025-09-12 00:00:00','https://cs.hit.edu.cn/2025/0909/c11271a377322/pagem.htm'),
  (14,'信息科学与技术学院','信息科学与技术学院','_No response_','2025-06-23 00:00:00','https://sist.shanghaitech.edu.cn/2025/0504/c7339a1110662/page.htm'),
  (12,'计算机学院','计算机学院','预推免','2025-08-10 23:59:59','https://cs.nju.edu.cn/cb/d4/c1702a773076/page.htm'),
  (15,'上海AILAB','上海AILAB','_No response_','2025-05-25 23:59:00','https://mp.weixin.qq.com/s/zUqlRTn-dgU0Q6mgn6tbpw'),
  (1,'人工智能学院','人工智能学院','2025年清华大学人工智能学院大学生学术交流日活动诚邀优秀青年学生报名参与','2025-05-15 13:00:00','https://mp.weixin.qq.com/s/fCoXyjPhaedsY_oz5U-Ddw'),
  (12,'智能科学与技术学院','智能科学与技术学院','预推免','2025-09-01 17:00:00','https://is.nju.edu.cn/de/94/c57160a777876/page.htm'),
  (16,'计算机科学与技术学院','计算机科学与技术学院','复试时间暂定：9月14日-15日，线下举行，具体安排另行通知','2025-09-10 12:00:00','https://cs.tongji.edu.cn/info/1022/3744.htm'),
  (17,'软件工程学院','软件工程学院','预推免','2025-08-10 10:00:00','https://sse.sysu.edu.cn/article/938'),
  (18,'信息科学与技术学院','信息科学与技术学院','各专业将择优选拔进入复试的推免申请学生，2025年9月16日15:00前通过电话和邮件发送复试通知，最终复试名单会于2025年9月17日14:00前在QQ群中发布','2025-09-16 10:00:00','https://ist.nenu.edu.cn/info/1157/6181.htm'),
  (17,'网络空间安全学院','网络空间安全学院','预推免','2025-08-31 23:55:00','https://scst.sysu.edu.cn/news/news02/1419513.htm'),
  (19,'信电学院','信电学院','_No response_','2025-06-16 00:00:00','http://www.isee.zju.edu.cn/2025/0515/c21109a3049527/page.htm'),
  (19,'集成电路学院','集成电路学院','_No response_','2025-06-17 00:00:00','https://ic.zju.edu.cn/2025/0522/c54011a3054130/page.htm'),
  (13,'电子与信息学院','电子与信息学院','_No response_','2025-06-01 00:00:00','https://seie.hit.edu.cn/2025/0507/c17148a369613/page.htm'),
  (20,'信息学部计算机科学与技术学院','信息学部计算机科学与技术学院','_No response_','2025-06-08 00:00:00','http://cist.hitsz.edu.cn/info/1038/2037.htm'),
  (20,'集成电路学院','集成电路学院','_No response_','2025-06-07 17:00:00','http://ic.hitsz.edu.cn/info/1032/2527.htm'),
  (13,'电气工程及自动化学院','电气工程及自动化学院','_No response_','2025-06-01 00:00:00','https://hitee.hit.edu.cn/2025/0510/c17101a369720/page.htm'),
  (20,'信息科学与技术学院','信息科学与技术学院','_No response_','2025-06-01 00:00:00','http://cist.hitsz.edu.cn/info/1038/2039.htm'),
  (20,'智能学部','智能学部','_No response_','2025-06-08 00:00:00','http://intelligence.hitsz.edu.cn/currency.jsp?urltype=news.NewsContentUrl&wbtreeid=1259&wbnewsid=1421'),
  (16,'上海自主智能无人系统科学中心','上海自主智能无人系统科学中心','_No response_','2025-06-14 17:00:00','https://srias.tongji.edu.cn/62/2c/c17827a352812/page.htm'),
  (16,'电子与信息工程学院','电子与信息工程学院','_No response_','2025-06-13 12:00:00','https://see.tongji.edu.cn/info/1147/13909.htm'),
  (1,'电子工程系','电子工程系','信息光电子研究所开放日','2025-06-09 00:00:00','https://www.ee.tsinghua.edu.cn/info/1078/4783.htm'),
  (21,'前沿交叉科学学院','前沿交叉科学学院','复试名单公布：2025年9月14日

复试时间：2025年9月16日','2025-09-14 00:00:00','https://sais.ucas.ac.cn/index.php/zh/xwgs/tgzs/1369-2026'),
  (19,'计算机学院','计算机学院','_No response_','2025-06-25 00:00:00','http://www.cs.zju.edu.cn/csen/2025/0528/c27011a3056015/page.htm'),
  (22,'自动化科学与工程学院','自动化科学与工程学院','6月1号开始报名','2025-06-11 00:00:00','https://automation.xjtu.edu.cn/info/1009/2253.htm'),
  (22,'计算机学院','计算机学院','6月1号开始报名','2025-06-11 00:00:00','http://www.cs.xjtu.edu.cn/info/1233/3673.htm'),
  (23,'北京中关村学院','北京中关村学院','_No response_','2025-06-25 17:00:00','http://www.bjzgca.edu.cn/NewsDetail.aspx?ID=363'),
  (21,'杭州高等研究院智能科学与技术学院','杭州高等研究院智能科学与技术学院','1.计算机类、电子信息类、自动化类、数学类、信息管理与信息系统等相关专业的2026届本科毕业生。

2.具有良好的政治素质和思想道德素养，政治立场坚定，无违法违纪受处分记录，身心健康，无不良嗜好；

3.学习成绩优秀，本科前两年半学习成绩在所在专业年级排名居前列；

4.对本院研究方向有浓厚兴趣，有较强的科研潜力；

5.英语水平良好，通过国家英语四级考试。','2025-06-16 00:00:00','http://hias.ucas.ac.cn/znkxyjs/info/1095/1821.htm'),
  (3,'上海高等研究院','上海高等研究院','预推免','2025-09-29 00:00:00','https://mp.weixin.qq.com/s/oS0nWGTYaX3UlIYN0FRfQg'),
  (24,'信息学院(特色化示范性软件学院）','信息学院(特色化示范性软件学院）','本年度夏令营采用线下进组实习实践的参营模式，实习实践时间在7月7日-7月11日之间，实习实践时长不少于3天，不超过5天。','2025-06-16 00:00:00','https://informatics.xmu.edu.cn/info/1050/45710.htm'),
  (17,'人工智能学院','人工智能学院','预推免','2025-09-09 17:00:00','https://sai.sysu.edu.cn/article/608'),
  (25,'文理学院','文理学院','获得复试资格的申请人应在参加复试前，通过我校推免申请系统缴纳复试费 100元/人','2025-09-11 23:59:00','https://fas.bnu.edu.cn/xwdt/tzgg/72865475db0746eb95398f266a6c9130.htm'),
  (25,'人工智能学院','人工智能学院','系统内材料收到情况最晚于9月11日23:59进行状态更新，推免复试时间暂定9月15-16日，具体安排后续通知，请考生一定提前合理安排行程、购买车票','2025-09-11 12:00:00','https://mp.weixin.qq.com/s/asTU-yiaDUL1lf6X3VQQkQ'),
  (3,'软件研究所','软件研究所','为了增进高校优秀大学生对中国科学院软件研究所（以下简称“软件所”）的了解，激发大学生对计算机科学和软件工程的研究兴趣，软件所定于2025年7月中下旬举办2025年全国大学生“软件与网络”夏令营。 

　　本次夏令营活动主要包括：软件所简介、主要研究方向及成果介绍、师生交流、招生咨询等。欢迎广大优秀大学生报名参加。','2025-06-23 00:00:00','https://is.cas.cn/yjsjy2016/zsxx2016/202505/t20250530_7794448.html'),
  (26,'应用物理与计算数学研究所','应用物理与计算数学研究所','具有物理学、数学、力学、核科学与技术四个一级学科博士学位授予权，现有基础数学、计算数学、应用数学、理论物理、粒子物理与原子核物理、原子与分子物理、等离子体物理、光学、无线电物理、流体力学、计算机科学与技术、光学工程、物理电子学、核能科学与工程、核技术及应用共计15个招生专业','2025-06-21 00:00:00','https://mp.weixin.qq.com/s/tPfmKdfVAn8xnhGPzpBW-g'),
  (27,'软件学院','软件学院','（1）上机考试：考核推免生对专业知识的应用、实践经验以及程序设计能力。（100分）

（2）笔试：《算法设计综合》（100分）

（3）面试：综合素质、能力测试和外语听说能力测试（100分）','2025-09-15 15:00:00','http://csw.jlu.edu.cn/info/1156/7969.htm'),
  (11,'计算机学院','计算机学院','_No response_','2025-07-03 23:59:59','https://ga.sjtu.edu.cn/zsgl/xlygl/yxhdbfcxnr.aspx'),
  (4,'智能学院','智能学院','请于2025年9月11日16：00前，寄达纸质版材料，或工作时间送达纸质版材料
预计复试时间安排在9月中旬，具体时间以后续发布的复试通知为准。',NULL,'https://www.cis.pku.edu.cn/info/1034/3463.htm'),
  (27,'计算机科学与技术学院','计算机科学与技术学院','1、笔试（100分）

《算法设计综合》

2、面试（100分）

3、上机（100分）','2025-09-15 09:00:00','http://ccst.jlu.edu.cn/info/1229/20578.htm'),
  (28,'地理与信息工程学院','地理与信息工程学院','我院研招校园开放日活动主要包括招生政策宣讲、学科解读、导师与学生互动交流等。活动采用线上方式','2025-06-21 00:00:00','https://xgxy.cug.edu.cn/info/1013/32730.htm'),
  (28,'计算机科学与技术学院','计算机科学与技术学院','- 我院研招校园开放日活动采用线上线下相结合的方式
- 招生政策宣讲、学科解读以及导师与学生交流互动','2025-06-21 00:00:00','https://cs.cug.edu.cn/info/1021/8621.htm'),
  (4,'计算机学院','计算机学院','预推免',NULL,'https://cs.pku.edu.cn/info/1051/3935.htm'),
  (19,'软件学院','软件学院','预推免','2025-09-09 12:00:00','http://www.cst.zju.edu.cn/2025/0730/c32178a3072203/page.htm'),
  (11,'集成电路学院（信息与电子工程学院）','集成电路学院（信息与电子工程学院）','_No response_','2025-06-26 00:00:00','https://icisee.sjtu.edu.cn/yanjiusheng-zsgz-bszs/2552.html'),
  (29,'计算机与人工智能学院','计算机与人工智能学院','夏令营期间，学院将同时安排2026年推荐免试研究生选拔工作，选拔结束后初步确定推荐免试研究生候选人。
取得候选人资格的学生需获得本科就读学校推免资格，并在规定时间重新提交加盖学校教务处证明章的前六学期成绩单、学业成绩排名等材料，我院将对考生的推免接收资格进行重新审核，通过审核后方能确定录取资格。',NULL,'https://scai.sufe.edu.cn/b0/e9/c17910a241897/page.htm'),
  (21,'信息工程研究所','信息工程研究所','https://mp.weixin.qq.com/s/DCO0ZoN8AYKKxmc8r9yklg','2025-06-26 23:59:59','https://mp.weixin.qq.com/s/DCO0ZoN8AYKKxmc8r9yklg'),
  (19,'网络空间安全学院','网络空间安全学院','_No response_',NULL,'https://icsr.zju.edu.cn/2025/0530/c70144a3057299/page.htm'),
  (4,'软件与微电子学院','软件与微电子学院','如果你是一战，我建议你去考软微，拿下top2人这一辈子就满足了
如果你是二战，我建议你去考软微，有过一战的沉淀二战的你已经无比强大，数据也显示软微二战上岸率很高
如果你是三战，我建议你考软微，因为软微放两年实习，考上了之前两战浪费的时间通通弥补
如果你是四战，我还是建议你考软微，此时的你已经无牵无挂，唯有上北大你才能拿回属于你的一切','2025-09-10 16:00:00','https://www.ss.pku.edu.cn/admission/admnotice/4698.html'),
  (4,'电子学院','电子学院','_No response_','2025-06-18 00:00:00','https://ele.pku.edu.cn/info/1063/3698.htm'),
  (4,'集成电路学院','集成电路学院','_No response_','2025-06-18 00:00:00','https://ic.pku.edu.cn/rcpy/yjszs/fe8d13de71c144ddadc0ba59d283ed5d.htm'),
  (17,'集成电路学院','集成电路学院','_No response_','2025-06-23 00:00:00','https://sic.sysu.edu.cn/rc/rc05/1419220.htm'),
  (30,'大数据学院','大数据学院','6月15日10:00开始报名','2025-07-05 17:00:00','https://sds.fudan.edu.cn/3d/23/c17701a736547/page.htm'),
  (25,'未来教育学院','未来教育学院','学不下去cs就来当老师吧（','2025-06-20 23:59:59','https://mp.weixin.qq.com/s/Fgi42hjorlwmEYtwyNRQ4w'),
  (31,'软件学院','软件学院','本次复试采取线下考核的形式，复试时间：9月20日（周六）全天，复试地点：山东大学软件园校区（山东省济南市历城区舜华路1500号）','2025-09-15 12:00:00','https://www.sc.sdu.edu.cn/info/1019/5479.htm'),
  (32,'空天网信所','空天网信所','_No response_','2025-07-11 00:00:00','https://mp.weixin.qq.com/s?__biz=MzU2NDY1MDA4Ng==&mid=2247492104&idx=1&sn=4927f6ef68db40cd02a1f4decdcfe4f2&chksm=fd6a998c25817cc9a2f6573f17cca5f85763b6df3838331b4d6323064bf420ac540290fccd8e&mpshare=1&scene=23&srcid=0610cehbVZWhorrxqmFMUXME&sharer_shareinfo=758238a374b5c87151d184da915b79ba&sharer_shareinfo_first=523c784e786eaeddcbcfbb847e80cccf#rd'),
  (3,'沈阳自动化研究所','沈阳自动化研究所','报名自即日起，不设置截止时间，随时报名，请提前至少2天报名所选批次。
第一批复试的时间9月11日，第二批复试的时间9月18日','2025-09-22 00:00:00','http://www.sia.cas.cn/zpjy/yjsjy/zs/zsgg/202509/t20250901_7948380.html'),
  (11,'人工智能学院','人工智能学院','复试：9月18日左右，具体安排将通过邮件和短信通知','2025-09-13 17:00:00','https://mp.weixin.qq.com/s/ABRzw6mtK2bvOVzdMMcDHA?scene=1'),
  (31,'信息科学与工程学院','信息科学与工程学院','学术型：光学工程（080300）、信息与通信工程（081000）、电子科学与技术（080900）；
专业型：通信工程（085402）、集成电路工程（085403）、光电信息工程（085408）、人工智能（0854100）。

活动方式：暂定网络视频会议
日程安排：暂定7月上旬，具体时间另行通知。
活动内容：包括开营式、学术报告、学科负责人师生交流会、面试选拔、闭营式等。
营员须按要求全程参加活动，通过面试选拔优秀营员。','2025-06-25 00:00:00','https://sduyjs.sdu.edu.cn/yjszs/plugins/zs/xlyxsd/entrance#/xlyksdSummerCampEntranceDetail?a=1749538323928001631&b=1743468572197001631'),
  (33,'信息科学与工程学院','信息科学与工程学院','兰州大学将为营员提供夏令营期间的食宿(本地学校学生不提供住宿)、人身保险费以及异地学校学生往返高铁二等座或硬卧、硬座火车票及汽车票(往返报销上限800元)。住宿提供双人标间，原则上要求双人入住。请自行提前预订往返车票，主办方不提供订票服务;','2025-06-23 18:00:00','https://xxxy.lzu.edu.cn/tongzhigonggao/2025/0614/312853.html'),
  (34,'计算机科学与工程学院','计算机科学与工程学院','本次夏令营采取线下形式进行，具体安排包括：

1.开营典礼：由学校统一组织。

2.讲座与交流：专家讲座、师生互动、学术交流等。

3.素质拓展：团队协作、沟通能力等。

五、政策支持

1.学习保障：学院安排资深专业教师担任班主任，安排成长辅导员。

2.食宿安排：学校为所有营员提供免费用餐（餐标：50元/天）；为所有校外营员提供免费住宿（双标或单间）；为所有营员免费提供统一着装（文化衫1件）。

3.交通补助：为鼓励校外高校大学生报名，对省外高校营员提供150元/人交通补助，对省内校外营员提供75元/人交通补助。

4.安全保障：为全体营员购买意外伤害保险。','2025-06-24 00:00:00','https://computer.hnust.edu.cn/tzgg/402ac6eaea36443ea6d0cb718f3eb6e6.htm'),
  (35,'光电信息与计算机工程学院','光电信息与计算机工程学院','活动方式：本校学生-线下学术营，外校学生-线上学术营（采用腾讯视频会议方式进行）

招生专业及招生规模：光学工程（共100人）、信息与通信工程 /仪器科学与技术（100人）、控制科学与工程（100人）、计算机科学与技术/软件工程（100人）','2025-06-23 00:00:00','http://oece.usst.edu.cn/2025/0610/c9009a343044/page.htm'),
  (36,'计算机科学与技术学院/软件学院实验室开放日','计算机科学与技术学院/软件学院实验室开放日','学校针对推免生实施“创新英才”培养计划，主要内容如下：1.入选推免生可在大四期间与2025级研究生同步修读硕士、博士研究生课程，成绩合格后，认定为硕士、博士生学习阶段学分；2.提前选择导师，优先推荐高水平指导教师，大四阶段提前进入导师科研团队；3.本科毕业设计可选择研究生导师相关课题进行；4.本科阶段可申请（主持或参与）各类研究生创新基金项目资助；5.根据相关管理办法，可优先支持参加跨学科协同培养；优先获得短期出国访学项目和国际学术交流基金资助；获得直博资格的研究生，短期访学资助期限可择优延长至6-12
个月；直博生优先选拔进入学校“引航计划”拔尖创新人才培养班；6.本培养计划内的硕士研究生，优先推荐硕博连读；','2025-06-29 23:59:00','https://cs.nuaa.edu.cn/2025/0614/c10851a377816/page.htm'),
  (37,'人工智能教育学部','人工智能教育学部','预推免','2025-09-15 00:00:00','https://foaie.ccnu.edu.cn/info/1008/9893.htm'),
  (38,'北京通用人工智能研究院','北京通用人工智能研究院','1. 人工智能相关或交叉专业，意向申请2026年（秋季）博士的本科或硕士在读学生；
2. 有志从事通用人工智能或AI交叉方向研究，认可联培项目的培养模式；
3. 学业水平、英语水平及其它条件需满足意向报考的联培高校相应院系的遴选要求；
4. 本科在读学生：预计能够取得2026级直博资格，并报考联培高校的相应院系。','2025-07-01 00:00:00','https://mp.weixin.qq.com/s/1owPgHcDxtbxDovnmup93Q'),
  (37,'计算机学院','计算机学院','1. 活动时间：2025年7月2日

2. 活动内容：学院介绍、学术讲座、学院参观、师生交流等。

3. 活动形式：线下举办。

4. 招收人数：拟招收80名营员。','2025-06-18 17:00:00','https://cs.ccnu.edu.cn/info/1115/7416.htm'),
  (24,'国际中文教育学院','国际中文教育学院','暑期夏令营期间食宿统一安排，本次夏令营对营员提供夏令营期间在校的食宿费用以及不超过300元的往返交通补贴，具体办法另行通知。','2025-06-26 00:00:00','https://oec.xmu.edu.cn/info/1051/87393.htm'),
  (39,'计算机与软件学院','计算机与软件学院','报名成功后进行分批次面试，具体面试时间将在2026级推免生招生通知QQ群内进行通知。','2025-09-18 00:00:00','https://mp.weixin.qq.com/s/mKYbpEEWL-Ok0zxnnDm46w'),
  (40,'软件工程学院','软件工程学院','https://mp.weixin.qq.com/s/K8Sy05GRRLSp931VTXYBxQ','2025-06-28 12:00:00','https://mp.weixin.qq.com/s/K8Sy05GRRLSp931VTXYBxQ'),
  (41,'电子信息工程学院','电子信息工程学院','信息与通信工程、电子科学与技术、新一代电子信息技术（专业学位）、通信工程（专业学位）、人工智能（专业学位）
以网络远程方式或现场开展：各研究所进行网络或现场宣讲和展示。','2025-07-15 00:00:00','https://eie.bjtu.edu.cn/cms/item/6161.html'),
  (42,'人工智能学院','人工智能学院','预推免','2025-08-30 12:00:00','https://ai.nankai.edu.cn/info/1024/6309.htm'),
  (43,'信息科学与工程学院','信息科学与工程学院','本次夏令营招收学员100名左右。网络远程，使用腾讯会议平台','2025-06-26 00:00:00','https://cise.ecust.edu.cn/2025/0618/c7692a179923/page.htm'),
  (44,'信息科学技术学院','信息科学技术学院','本次夏令营不收取任何费用，学院为广州市外学员提供夏令营活动期间的住宿（校外酒店或宾馆，共1晚），为所有正式营员提供午餐。请各学员自理往返交通费、人身保险费（保险期为7月7日至7月10日，必须购买，报到时提供保单）','2025-07-01 00:00:00','https://xxxy.jnu.edu.cn/2025/0617/c27469a838563/page.htm'),
  (45,'网络空间安全学院','网络空间安全学院','1．本科三年级在校生（2026届毕业生），全国重点高校相关专业，或获得互联网+/挑战杯获国奖、全国大学生信息安全竞赛创新实践能力赛/作品赛决赛二等奖、强网杯全国网络安全挑战赛二等奖、全国密码技术竞赛二等奖、全国高校密码数学挑战赛二等奖、ACMICPC国际大学生程序设计大赛区域赛铜牌、开源奖励计划二等奖、创新实践计划资助、国家级大学生创新性实验计划，或学科相关相当水平及以上竞赛获奖的主力成员。

2．对所报专业的学术研究有浓厚兴趣，学习成绩优秀，本科综合成绩在专业排名居前20％或前5名，有较强的创新意识、创新能力和专业能力。

3．英语水平良好。

4.思想表现优良，诚实守信，学风端正，未受过任何处分。','2025-06-27 00:00:00','https://cse.hust.edu.cn/info/1079/4272.htm'),
  (3,'自动化研究所','自动化研究所','1. 自动化、计算机、数学、电子、智科、物理、生物及有志于开展交叉学科研究的相关专业的2022级本科生（拟于2026年毕业的本科生）； 

2. 本科期间学习成绩优秀，具有推免资格，对开展科学研究有浓厚兴趣，有较强的或潜在的研究能力； 

3. 能熟练使用计算机语言编写程序，具有较强的动手能力； 

4. 英语水平良好。','2025-06-30 17:00:00','http://ia.cas.cn/yjsjy/zs/sszs/202506/t20250616_7869601.html'),
  (45,'计算机科学与技术学院','计算机科学与技术学院','9 月20 日上午9:00-10:30：进行线下机考，具体安排请关注官网通知。
9 月20 日下午13:30-18:00：进行线下综合能力复试考核','2025-09-16 12:00:00','http://cs.hust.edu.cn/info/1439/5264.htm'),
  (46,'软件学院','软件学院','不发offer','2025-06-26 12:00:00','https://soft.buaa.edu.cn/news_nry.jsp?urltype=news.NewsContentUrl&wbtreeid=1117&wbnewsid=11912'),
  (47,'信息学院','信息学院','_No response_','2025-07-05 17:00:00','http://info.ruc.edu.cn/xwgg/xygg/eecc5e59b2434c7dad634d1cbc517927.htm'),
  (48,'一二三院','一二三院','充分展示火箭军崇高使命和学校办学特色优势，结合招收参军入伍研究生和无军籍研究生相关政策。
1.夏令营不收取任何费用，入选后须全程参与夏令营的各项活动。全程参加夏令营的营员可报销往返差旅费（凭票据报销，标准不超过高铁二等座，往返地限同一地至西安，行程时间限本次活动举办时间前后1天之间），并提供免费食宿（7月16日14时至18日中午住宿、双人标间），发放精美纪念品。
2.营员申请材料务必真实有效，如有不实、弄虚作假，学校将取消其营员资格。
3.正式参军入伍须在2025年8月参加兵员征集部门组织的体格检查和政治考核，且结论为合格。如身高要求为男性不低于162cm,女性不低于158cm；双眼中任何一眼裸眼视力不小于4.5等。','2025-07-09 00:00:00','https://mp.weixin.qq.com/s/SGjQdYA-EtIjn5EUFowa6w'),
  (31,'网络空间安全学院（研究院）','网络空间安全学院（研究院）','山东大学网络空间安全学院将于7月9日-10日举办“2025年全国优秀大学生暑期夏令营”活动，诚邀全国范围内网络空间安全、信息安全、数学、计算机、软件、信息等相关学科的优秀本科生参加。
报名时间：6月18日8：00至6月26日22：00
报名条件：详情见学院链接
学术型：网络空间安全（083900）
专业型：网络与信息安全（085412）','2025-06-25 10:00:00','https://cst.qd.sdu.edu.cn/info/1023/3688.htm'),
  (27,'人工智能学院','人工智能学院','参加我院2025年“校园学术活动开放日”考核合格的同学，如果确认报考我院，必须按上述要求在“推免生报名”系统报名,但不需要参加复试','2025-09-15 12:00:00','https://sai.jlu.edu.cn/info/1125/5188.htm'),
  (36,'人工智能学院','人工智能学院','_No response_','2025-06-26 23:59:00','南京航空航天大学'),
  (25,'心理学部','心理学部','1、思想品德良好，身心健康，遵纪守法，学习刻苦，有较强的学习能力和科研创新潜力，愿为社会主义现代化建设服务。诚实守信，学风端正，无任何考试作弊和剽窃他人学术成果记录。未受过任何处分。

2、全国高校心理学、生物学、数学、医学、物理学、教育学、计算机科学、信号处理、电子、自动控制等相关专业本科三年级在校生，即2026年应届毕业生；

3、本科期间学习成绩优秀，外语水平较好，能够获得所在学校推荐免试资格的同学优先，或者科研能力出色（如有高质量学术论文公开发表，丰富的科研项目经历，或者在全国重大竞赛中获奖等）；

4、能够全程参加本次夏令营。','2025-06-24 00:00:00','https://psych.bnu.edu.cn/xwzx/tzgg/7ee7e1268fa84b719576053d714e53be.htm'),
  (45,'武汉光电国家研究中心','武汉光电国家研究中心','武汉光电国家研究中心是科技部于2017年批准组建的6个国家研究中心之一，其前身为建设十余年的武汉光电国家实验室（筹）。研究中心聚焦信息光电子、能量光电子和生命光电子三大领域的基础性科学和技术问题，开展前瞻性、战略性、前沿基础交叉研究。研究中心学科交叉特色显著，涉及的学科几乎涵盖所有工、理、医科。

热忱欢迎光学工程、生物医学工程、计算机科学与技术、电子科学与技术、电子与通信工程、控制科学与工程、机械科学与工程、材料科学与工程等相关工科，以及数学、物理学、化学、生物学等理科相关专业及医学相关专业的同学踊跃报名。','2025-06-23 17:00:00','https://mp.weixin.qq.com/s?__biz=MjM5ODM5MTQ4MQ==&mid=2651622859&idx=1&sn=0a196c55608c79fea5660d05f7ad6230&chksm=bcd7358a26f81eea9fdc832fa41942aefb5607f0afab88c71296fe76d0f5b181128dd62f80db&mpshare=1&scene=23&srcid=0619EiozvM61dusbSXQZvDxH&sharer_shareinfo=dd01f6bb8411a110bac8fcef1c5fe4f8&sharer_shareinfo_first=9cc046756b29e6a7e0f4614622ad69d4#rd'),
  (49,'网络空间与信息安全学院','网络空间与信息安全学院','_No response_','2025-07-01 00:00:00','http://cybersec.ustc.edu.cn/2025/0619/c23826a688133/page.htm'),
  (40,'计算机科学与技术学院','计算机科学与技术学院','预推免','2025-09-10 10:00:00','https://mp.weixin.qq.com/s/t21c4qzXHlVE6j56uPayvQ'),
  (50,'计算机（网安）学院','计算机（网安）学院','优秀营员”获得者若取得所在本科学校推免资格，且符合我校推免生接收条件，并在教育部推免系统中第一志愿填报获得“优秀营员”对应专业的硕士研究生，学院将优先拟录取。本次“优秀营员”仅限硕士研究生。

综合面试，分值：300分。含英语考核，分值：100分。综合考核，分值：200分。

面试流程：

（1）考生3分钟自我介绍（可外语），介绍本人学习、科研、社会实践或实际工作表现等。仅限口述表达。

（2）外语能力考查（不少于5分钟）。由面试专家组对考生的口语和听力进行测试。

（3）专业知识考查。题库中抽取1道题目作答，重点考查程序设计、算法设计与分析、软件工程、计算机组成原理、数据库、计算机网络、编译原理、密码学（该科目限报考083900网络空间安全及145200密码专业考生）等基础知识情况。

（4）专业素质和能力考查。

每个考生面试考核时间一般不少于20分钟。','2025-07-03 17:00:00','https://www.scse.uestc.edu.cn/info/1015/17213.htm'),
  (49,'人工智能与数据科学学院','人工智能与数据科学学院','老师：夏令营有机试，占比很大，因此入营后能否拿到优秀营员主要就看各位自己了。','2025-07-01 00:00:00','https://saids.ustc.edu.cn/2025/0619/c15435a688136/page.htm'),
  (41,'计算机科学与技术学院','计算机科学与技术学院','本次夏令营面向全国拟通过推免方式报考我院各专业的2026届应届本科毕业生，活动内容包括介绍我院研究生培养特色、招生政策及学科优势；组织营员与导师团队交流，促进双向了解。

夏令营为招生宣传活动，不设选拔考核、优秀营员评选及任何形式的录取承诺。','2025-07-01 12:00:00','https://cs.bjtu.edu.cn/zsjy/yjszs3/yjszs_sszs/de2c8a13fbb1409399059a26d571080c.htm'),
  (51,'计算机学院（软件学院、智能科学与技术学院）','计算机学院（软件学院、智能科学与技术学院）','需要统一注册，如已经注册过夏令营，不用重新注册，用夏令营帐号密码登录，但需重新报','2025-09-10 12:00:00','https://cs.scu.edu.cn/info/1247/19383.htm'),
  (3,'深圳先进技术研究院先进计算与数字工程研究所','深圳先进技术研究院先进计算与数字工程研究所','全国高校三年级本科在校生（2026届本科毕业生），“双一流”高校本科生优先；
具备计算机、电子信息、人工智能、通信工程、自动化、生物医学工程、地理信息系统、数学等相关或相近专业基础知识，跨学科报考需具备相当计算机专业基础；','2025-06-26 00:00:00','https://mp.weixin.qq.com/s/fvOfBOrnE7OeR-QWZe0FAQ'),
  (3,'香港中文大学深圳先进集成技术研究所','香港中文大学深圳先进集成技术研究所','计算机、自动化、电子信息、机器人、人机交互、人工智能、机械、智能系统与装备、材料、精密工程、仪器仪表、生物医学工程、光学工程等相关和相近专业；
夏令营期间不收取任何费用。可报销从学校/家庭所在地至深圳的单程交通费用(按火车(汽车)硬座或硬卧或动车二等座标准)，夏令营期间提供免费食宿、文化衫、周边礼包等等','2025-06-26 00:00:00','https://siait.siat.ac.cn/siat/2025-05/30/article_2025053017375065876.html'),
  (51,'网络空间安全学院','网络空间安全学院','我院将在2025年9月15日左右在预推免报名系统中完成审核，凡通过审核的均可参加我院的预推免复试，本次复试采取线上复试形式','2025-09-13 00:00:00','https://ccs.scu.edu.cn/info/1038/4224.htm'),
  (41,'网络空间安全学院','网络空间安全学院','_No response_','2025-07-07 12:00:00','https://cst.bjtu.edu.cn/rcpy/yjszs2/zszx_yjs/e4d8fe8d46f34c43ad5321cc855a5549.htm'),
  (39,'人工智能学院','人工智能学院','1.学生全勤并提交一份合格的科研报告可获得结业证书。2.学院统一安排暑期学校期间食宿。','2025-07-08 21:00:00','https://mp.weixin.qq.com/s/P_kfeO4r2kGIhMbw0cyhDQ'),
  (19,'数据科学研究中心','数据科学研究中心','预推免(海宁学费不低)','2025-09-10 17:00:00','http://cds.zju.edu.cn/a/zsxx/3675.html'),
  (13,'郑州研究院','郑州研究院','预报名专业领域及代码为：0854电子信息、0855机械、0856材料与化工、0858能源动力、0860生物与医药','2025-07-14 00:00:00','https://zri.hit.edu.cn/2025/0620/c13996a372501/page.htm'),
  (52,'计算机与软件学院','计算机与软件学院','（1）差旅、食宿：提供校园开放日期间在南京的食宿（外地学生提供7月10日晚的住宿，本校和南京本地学生住宿自理），交通均自理。（2）保险：学院将为参加校园开放日的同学购买开放日间人身意外伤害保险','2025-07-03 09:00:00','https://cies.hhu.edu.cn/2025/0620/c4093a304656/page.htm'),
  (53,'计算机与人工智能学院','计算机与人工智能学院','学院对参与意向征集的同学所提供的信息进行审核，审核通过的学生可参加学院组织的师生见面会， 后续详细信息请密切关注计算机与人工智能学院官网通知或密切关注邮箱。','2025-09-22 00:00:00','https://scai.swjtu.edu.cn/web/page-newsDetail.html?nid=376c0648-2b57-40de-9958-2a94918ece79'),
  (40,'上海智能教育研究院（智能教育实验室）','上海智能教育研究院（智能教育实验室）','硕士（专业学位） | 电子信息（人工智能）085410
博士（学术学位） | 智能教育0812Z1
我院为入选营员提供伙食（中餐与晚餐）。往返差旅费与住宿费由营员自理，学院将根据情况适当给予学员差旅补助。','2025-07-01 00:00:00','https://mp.weixin.qq.com/s/LcPwnoovYIS6tdbpZ7pMgA'),
  (47,'高瓴人工智能学院','高瓴人工智能学院','进入复试考核的同学，CCF CSP成绩在300分（含300分）以上，笔试成绩在原基础上增加5分','2025-09-07 23:59:00','http://ai.ruc.edu.cn/newslist/notice/20250904001.html'),
  (54,'人工智能学院','人工智能学院','请符合报名条件的考生（包括已经取得夏令营A类营员资格的考生，否则视为放弃A类营员资格 ）登录我校推免生申请系统进行预报名','2025-09-14 17:00:00','https://sai.whu.edu.cn/info/1601/9731.htm'),
  (55,'信息科学与工程学院','信息科学与工程学院','_No response_','2025-06-29 00:00:00','https://xinxi.sdau.edu.cn/yjs/2025/0623/c12286a257285/page.htm'),
  (50,'资源与环境学院','资源与环境学院','第十届“地球与空间信息科学技术” 全国优秀大学生暑期夏令营
081000|信息与通信工程
081600 | 测绘科学与技术
085411 | 大数据技术与工程
140400 | 遥感科学与技术','2025-07-03 00:00:00','https://www.sre.uestc.edu.cn/info/1063/9979.htm'),
  (56,'工学院','工学院','1. 学术型硕士：机械工程、林业装备与信息化、林业电气化与自动化；

2.专业型硕士：机械、电子信息（控制、人工智能方向）。','2025-06-29 00:00:00','https://gxy.bjfu.edu.cn/yanjiushengjiaoyu/yanjiushengzhaosheng/6739baef0b8049b3b53df2eda0fe6f92.html'),
  (57,'心理学院','心理学院','优先条件：  ① 985/211毕业生；  ② 心理学、生理学、医学、计算机科学、数学等相关专业；  ③ 科研能力出众（如竞赛获奖、核心期刊发表论文）；  ④ 英语水平良好。
为了保证教学质量，本届暑期夏令营计划招收20名学员，根据报名情况择优录取。
免费提供食宿，报销往返路费。（限经济舱/高铁二等座/汽车票）','2025-06-30 17:00:00','https://mp.weixin.qq.com/s/zVYrsA14J5mA0VqcURRkdw'),
  (52,'人工智能与自动化学院','人工智能与自动化学院','学院为外地和在南京校区的学生提供7月5日晚的住宿，在常州校区的本院学生住宿自理；为所有参加开放日活动的同学提供7月6日中午的工作餐。','2025-07-02 12:00:00','https://ai.hhu.edu.cn/2025/0623/c15659a304813/page.htm'),
  (58,'体育人工智能研究院','体育人工智能研究院','体育人工智能研究院将为营员统一购买夏令营活动期间的意外保险，并统一安排夏令营期间的午餐。参加夏令营的交通和住宿费用由营员自理。','2025-06-30 12:00:00','https://mp.weixin.qq.com/s/727ANj4yMqKZtaiVMgZ_3Q'),
  (59,'电子信息类的5个学院','电子信息类的5个学院','增进优秀大学生对我校仪器科学与光电工程学院、自动化学院、信通学院、计算机学院、理学院的了解与认识
本科毕业专业为仪器类、控制类、通信类、计算机类、电子类等工学相关专业','2025-07-05 00:00:00','https://gd.bistu.edu.cn/tzgg/e950a3a75b41403eaa5e678656e7b04c.htm'),
  (12,'人工智能学院','人工智能学院','预推免','2025-08-31 17:00:00','https://ai.nju.edu.cn/f6/b8/c53055a784056/page.htm'),
  (60,'机械工程学院','机械工程学院','学术型硕士：机械工程（080200）、包装工程（0802Z1）；全日制专业硕士：机械工程（085501）。','2025-07-04 00:00:00','https://sme.jiangnan.edu.cn/info/1070/7593.htm'),
  (61,'电子工程学院','电子工程学院','线下/线上同时进行、主要活动包括但不限于：1. 导师实验室参观（招生联系方式见后附表格）：7月10日14：00-17：002. 团队基本情况介绍、学科前沿专题讲座、导师介绍、实验室科研方向初探3. 导师课题组科研成果展示、营员自主选择进一步了解各课题组的研究方向4. 填报意向方向及导师、师生线下/线上一对一交流','2025-07-21 00:00:00','https://mp.weixin.qq.com/s?__biz=MzA5MTY3MzAxOQ==&mid=2650708868&idx=1&sn=f2a84b204c4d6c0bfb6d36b38f1fa207&chksm=89eab03cd48c8c58e8a4c1ccb80508713c98eb7866024b79333f826282c33e794cdba83fe616&mpshare=1&scene=23&srcid=0625RmydCUs49WcSNtcR801R&sharer_shareinfo=1db624a8e9600161d71333d3f4744848&sharer_shareinfo_first=adac37608731e50bef44f43a57ea93be#rd'),
  (40,'心理与认知科学学院','心理与认知科学学院','专业为心理学、生物学、计算机科学、物理学、数学或其他与心理学相关专业
第一阶段（线上环节）：150名优秀大学生，其中学术学位、专业学位各75人
第二阶段（线下环节）：60名营员，其中学术学位、专业学位各30人
1.拟在线下阶段评选优秀营员，评选规则等另行通知。
2.提供夏令营线下阶段校内用餐和住宿。
3.购买夏令营线下阶段的保险。','2025-06-30 08:00:00','https://mp.weixin.qq.com/s/qqAl1vjdslw_-RPY5Zqoew'),
  (62,'计算机与电子信息学院/人工智能学院','计算机与电子信息学院/人工智能学院','我院将在9月17-21日间组织复试，复试的具体时间和安排将在推免生钉钉群通知','2025-09-17 00:00:00','https://ceai.njnu.edu.cn/info/1551/18741.htm'),
  (61,'计算机学院（国家示范性软件学院）','计算机学院（国家示范性软件学院）','预推免','2025-09-14 00:00:00','https://scs.bupt.edu.cn/info/1050/4239.htm'),
  (40,'电子信息（人工智能领域）专业学位产教融合','电子信息（人工智能领域）专业学位产教融合','计算机科学与技术、软件工程、数据科学与大数据技术、智能科学与技术、通信工程、微电子、网络安全、数学、物理、统计等相关专业','2025-07-09 00:00:00','https://mp.weixin.qq.com/s/DEMkpO0H9DlWBGVj6aOixQ?scene=1'),
  (63,'计算机与人工智能学院','计算机与人工智能学院','对于参加本次夏令营并最终保研至我院的学生，学院给与差旅费全额报销。同时，对每位保研录取的学生给予5000元的项目经费支持，本规则适用于正式录取并正常入学的学生。面向对象：全国高校计算机、人工智能、软件工程等相关专业大三及以上本科生、硕士研究生。报名材料：个人简历、成绩单、科研成果证明（如有）。活动时间：2025年7月20日-25日。活动地点：江西财经大学计算机与人工智能学院。活动特色：聚焦人工智能交叉领域热点，涵盖多模态数据融合、跨模态语义理解、情感计算应用等核心内容，接轨“新一代人工智能发展规划”战略方向。','2025-07-19 00:00:00','http://cai.jxufe.edu.cn/shows/12/373.html'),
  (64,'宣怀学院','宣怀学院','085400  电子信息   联培学院：精密仪器与光电子工程学院/微电子学院/医学院/电气自动化与信息工程学院/智能与计算学部','2025-07-03 00:00:00','https://mp.weixin.qq.com/s/i4VC311sfYnqjPJGfhTEsw'),
  (13,'产教融合人才培养基地（重庆）','产教融合人才培养基地（重庆）','有志于从事电子信息、能源动力、材料与化工等专业研究的2026届优秀应届本科毕业生，具有较强研究能力的理工科推免生优先考虑','2025-07-07 00:00:00','http://cri.hit.edu.cn/2025/0625/c15728a372715/pagem.htm'),
  (65,'智能科学与工程学院','智能科学与工程学院','面试时间一般不少于20分钟，面试专家组根据评分要求现场独立评分，面试全程录音录像对每位考生的作答情况进行现场记录。','2025-09-18 00:00:00','https://cisse.hrbeu.edu.cn/info/1219/6384.htm'),
  (30,'计算与智能创新学院','计算与智能创新学院','_No response_','2025-09-06 15:00:00','2025-11-27T00:00:00+08:00'),
  (54,'信息管理学院','信息管理学院','国内外高水平大学、全国重点大学的本科三年级在校生（2026届毕业生，含境外高校当年毕业学生），或所在学科为国家“双一流”学科，在最新一轮学科水平评估中排名靠前的本科三年级在校生（2026届毕业生）；
外语水平良好，至少满足以下其中一项条件：国家英语六级水平考试成绩425分以上；雅思成绩6.5分以上；TOFEL成绩90分以上','2025-06-30 23:59:00','https://sim.whu.edu.cn/info/1776/104172.htm'),
  (66,'网络空间安全学院','网络空间安全学院','本科专业为网络空间安全、信息安全、密码科学与技术、计算机类、电子信息类、东南大学数学类强基班。本科专业为其他专业的，需在校期间获得网络空间安全相关竞赛省级二等奖以上','2025-07-31 12:00:00','https://cyber.seu.edu.cn/2025/0627/c18210a534579/page.htm'),
  (67,'无人系统技术研究院','无人系统技术研究院','研究院分批次对推免生的报名信息进行初审，确定复试名单，向申请人发放复试通知','2025-09-20 18:00:00','https://wurenxitong.nwpu.edu.cn/info/1108/10258.htm'),
  (68,'信息工程学院','信息工程学院','9月18-23日，学院将根据网上申请情况，结合我院具体情况，与报名学生联系，确认相关信息，通知复试，请考生保持联系畅通','2025-09-19 00:00:00','https://cie.nwsuaf.edu.cn/dtytz/tzgg/fdb9d7db78e54a24a38f2af131683b30.htm'),
  (46,'大科学装置研究院','大科学装置研究院','本科专业为量子信息科学、测控技术与仪器、光学工程、生物医学工程、医学信息工程、微电子科学与工程、集成电路设计与集成系统、物理学、智能感知工程、光电信息科学与工程、探测制导与控制技术、微机电系统工程、电子信息工程、自动化、电气工程及其自动化、机械工程、计算机科学与技术、软件工程的学生优先。','2025-07-05 00:00:00','https://piqs.buaa.edu.cn/info/1038/2512.htm'),
  (60,'智能制造学院','智能制造学院','智能制造学院现招收机械工程博士、机械工程学硕、机械工程专硕、机器人工程专硕。本次夏令营拟招收营员40名。','2025-07-04 00:00:00','https://im.jiangnan.edu.cn/info/1044/1781.htm'),
  (46,'无人系统研究院','无人系统研究院','资格审查结果和复试通知预计在9月17日前以短信的方式分批发放','2025-09-15 18:00:00','https://wrj.buaa.edu.cn/info/1008/2659.htm'),
  (67,'计算机学院','计算机学院','英语六级≥425分
1.“双一流”高校应届本科生；
2.其它高校应届本科生且前6学期或前5学期平均学分绩位于所在专业的前1%。','2025-07-06 21:00:00','https://jsj.nwpu.edu.cn/info/1599/26125.htm'),
  (31,'计算机科学与技术学院/人工智能学院','计算机科学与技术学院/人工智能学院','又一个宣讲营','2025-07-08 00:00:00','https://www.cs.sdu.edu.cn/info/1068/6585.htm'),
  (66,'土木工程学院','土木工程学院','智慧建造','2025-07-24 12:00:00','https://civil.seu.edu.cn/2025/0627/c19887a534565/page.htm'),
  (66,'自动化学院','自动化学院','本科专业为自动化、机器人、测控技术、电气、计算机、人工智能、信息、电子、机械、数学等相关专业类','2025-07-31 12:00:00','https://automation.seu.edu.cn/2025/0627/c24460a534576/page.htm'),
  (69,'自动化与软件学院','自动化与软件学院','预推免','2025-09-15 00:00:00','https://zdhse.sxu.edu.cn/zxgg/e08090e8c3c741a7bc78f3521f0de356.htm'),
  (70,'计算机学院','计算机学院','预推免分两批进行：时间初步分别是9月5日-6日和9月12日-13日，具体安排另行通知。第一批参加预推免考生从8月30日前完成报名的考生中选拔，第二批参加预推免考生从9月6日前完成报名的考生中选拔','2025-09-07 00:00:00','https://cse.csu.edu.cn/info/1040/10626.htm'),
  (71,'信息科学与技术学院','信息科学与技术学院','_No response_','2025-07-04 16:00:00','https://web.dhu.edu.cn/cist/2025/0630/c3004a363415/page.htm'),
  (43,'卓越工程师学院','卓越工程师学院','线下遴选50人','2025-07-04 12:00:00','https://mp.weixin.qq.com/s/i2gZZwALYl33Cl2IIMa6Eg'),
  (72,'机器人科学与工程学院','机器人科学与工程学院','线下外校不超30人','2025-07-05 12:00:00','http://www.rse.neu.edu.cn/2025/0701/c2147a288720/page.htm'),
  (72,'计算机科学与工程学院','计算机科学与工程学院','线下外校不超60人','2025-07-04 08:00:00','http://www.cse.neu.edu.cn/2025/0701/c6274a288690/page.htm'),
  (66,'生物科学与医学工程学院','生物科学与医学工程学院','BME','2025-07-31 12:00:00','https://bme.seu.edu.cn/2025/0630/c480a534639/page.htm'),
  (61,'信息与通信工程学院','信息与通信工程学院','夏令营活动通过线上线下相结合方式开展，以招生导师组为单位进行，详见第四部分各招生导师组场次安排','2025-07-15 00:00:00','https://sice.bupt.edu.cn/info/1042/2509.htm'),
  (73,'中国科学院计算技术研究所','中国科学院计算技术研究所','### 报名截止日期

2025-07-09T15:00:00+08:00','2025-07-09 15:00:00','https://ict.cas.cn/xwgg/tzgg/202506/t20250630_7876973.html'),
  (61,'集成电路学院','集成电路学院','https://ic.bupt.edu.cn/info/1024/1576.htm','2025-07-10 00:00:00','https://ic.bupt.edu.cn/info/1024/1576.htm'),
  (50,'深圳高等研究院','深圳高等研究院','7月9日-7月10日暑期夏令营开营仪式，高研院介绍、专业介绍，学术讲座、高研院团队介绍','2025-07-09 00:00:00','https://sias.uestc.edu.cn/info/1235/5741.htm'),
  (74,'智能科学与技术学院','智能科学与技术学院','在线远程复试','2025-10-21 00:00:00','https://dxxy.bucea.edu.cn/sylm/tzgg/bad6f7360c814e338af1305f6481c055.htm'),
  (67,'软件学院','软件学院','“双一流”院校 2026 届本科生或其他高校2026届本科生前6学期或5学期成绩平均学分积（或学分绩点）专业排名前1%','2025-07-06 21:00:00','https://ruanjian.nwpu.edu.cn/info/1004/13316.htm'),
  (67,'网络空间安全学院','网络空间安全学院','线上组织学院及学科介绍、学术讲座','2025-07-06 21:00:00','https://wlkjaqxy.nwpu.edu.cn/info/1103/13630.htm'),
  (67,'光电智能研究院','光电智能研究院','_No response_','2025-07-06 21:00:00','https://iopen.nwpu.edu.cn/info/1051/6896.htm'),
  (72,'信息科学与工程学院','信息科学与工程学院','线下外校不超过40人','2025-07-04 00:00:00','http://www.ise.neu.edu.cn/2025/0630/c157a288658/page.htm'),
  (72,'软件学院','软件学院','外校优秀学生人数不超过30人','2025-07-07 00:00:00','http://sc.neu.edu.cn/2025/0702/c144a288807/page.htm'),
  (21,'计算机科学与技术学院','计算机科学与技术学院','本部预推免','2025-09-11 00:00:00','https://scce.ucas.ac.cn/index.php/zh-CN/tzgg/3589-2026'),
  (66,'计算机科学与工程学院、软件学院','计算机科学与工程学院、软件学院','外校学生需获得一位东南大学计算机科学与工程学院、软件学院研究生导师推荐','2025-08-02 00:00:00','https://cs.seu.edu.cn/2025/0702/c49475a534815/page.htm'),
  (75,'计算机科学与技术学院（软件学院）','计算机科学与技术学院（软件学院）','预推免
报名截止时间：每批次考试时间的前一周（以在线收集表提交时间为准，即8月23日23:59:59或9月3日23:59:59）','2025-09-03 23:59:59','https://scst.suda.edu.cn/33/30/c29557a668464/page.htm'),
  (76,'智能科学学院','智能科学学院','学院计划于9月18日左右进行复试，具体要求将在学院预推免面试QQ群发布（复试群号随复试通知一起发送）','2025-09-15 00:00:00','http://yjszs.nudt.edu.cn/pubweb/homePageList/detailed.view?keyId=14625'),
  (12,'匡亚明学院','匡亚明学院','学院导师简介如下：https://dii.nju.edu.cn/lsjs/list.htm；导师的代表性研究论文如下：https://box.nju.edu.cn/d/2da280d72ae24bce9167/。请选择至少两篇论文，分别撰写不少于2000字/篇的阅读笔记。内容包括但不限于：①论文的研究背景、研究方法和关键结论；②对论文相关内容开展后续研究的思考','2025-07-23 00:00:00','https://dii.nju.edu.cn/b8/d3/c11317a768211/page.htm'),
  (47,'智慧治理学院','智慧治理学院','现场考核包括面试、笔试两部分。面试重点考查考生综合素质，突出对考生创新思维、学术潜质、思想政治素质和品德的考查。笔试包含两个科目，其中科目一为专业素质，考查专业素质和能力；科目二为综合素质及外语能力','2025-07-10 10:00:00','http://su.ruc.edu.cn/notices_list/notices/54e08c26f4e740f088a89c4b4e521597.htm'),
  (77,'生物医学工程学院','生物医学工程学院','生物医学工程10人，电子信息技术4人','2025-07-04 10:00:00','https://yjsh.ccmu.edu.cn/yytz_2977/zs_3101/e0f0a819dbad44cc882bcaeea7533141.htm'),
  (1,'SIGS海洋工程研究院','SIGS海洋工程研究院','_No response_','2025-07-28 12:00:00','https://mp.weixin.qq.com/s/2EDTGCsUM23aqduU691Swg'),
  (76,'前沿交叉学科学院','前沿交叉学科学院','_No response_','2025-07-12 00:00:00','http://yjszs.nudt.edu.cn/pubweb/homePageList/detailed.view?keyId=14509'),
  (11,'溥渊未来技术学院','溥渊未来技术学院','一般应为“双一流”建设高校或“双一流”建设相关专业的本科三年级在校生（2026年应届本科毕业生）','2025-07-10 17:00:00','https://mp.weixin.qq.com/s/qQHFrgrcz5znqfFgcamTGw'),
  (30,'空间互联网研究院','空间互联网研究院','第二波！复旦大学空间互联网研究院 2025年全国优秀大学生夏令营报名通知（计算机科学与技术方向）','2025-07-20 17:00:00','https://mp.weixin.qq.com/s/r5xi0vsceb8L6l2V5wth0Q'),
  (76,'气象海洋学院','气象海洋学院','_No response_','2025-07-12 00:00:00','http://yjszs.nudt.edu.cn/pubweb/homePageList/newDetailed.view?keyId=14502'),
  (78,'计算机与通信工程学院','计算机与通信工程学院','预推免','2025-08-30 23:59:00','http://scce.ustb.edu.cn/xinwentongzhi/tongzhigonggao/2025-08-11/2224.html'),
  (76,'系统工程学院','系统工程学院','_No response_','2025-07-10 00:00:00','http://yjszs.nudt.edu.cn/pubweb/homePageList/newDetailed.view?keyId=14506'),
  (71,'计算机科学与技术学院','计算机科学与技术学院','本次夏令营计划招收营员50名左右，将于2025年7月15日线下举行。夏令营活动包括计算机学科前沿学术报告、招生宣讲等。热烈欢迎有志于我院深造的同学报名参加。','2025-07-07 16:00:00','https://cst.dhu.edu.cn/2025/0703/c12723a363566/page.htm'),
  (76,'计算机学院','计算机学院','第二批复试时间预计9月15-17日，具体安排将于推免通知群内另行通知。','2025-09-11 00:00:00','http://yjszs.nudt.edu.cn/pubweb/homePageList/detailed.view?keyId=14618'),
  (79,'军事科学院','军事科学院','我院负责研学学员的食宿（2人1间），并对全程参加研学活动学员的差旅费予以补助，补助标准为：京外学员可在不超过飞机经济舱或高铁二等座或普通火车硬座、硬卧标准内报销往返路费，且往返差旅费超出1000元的补助标准统一为1000元，超出部分由学生自行负担；低于1000元的按照票面实际价格进行核销；京内学员不予补助。
专业方向为：生物学、控制科学与工程、计算机科学与技术、土木工程、航空宇航科学与技术、兵器科学与技术、核科学与技术、生物医学工程、兽医学、基础医学、公共卫生与预防医学、药学等专业相关本科专业。','2025-07-09 18:00:00','https://mp.weixin.qq.com/s/AtDgHkAHsccV9PHf0-89sg'),
  (80,'空中交通管理学院','空中交通管理学院','线上线下相结合方式
交通运输类、电子信息类、计算机类、通信类等的2026届本科毕业生','2025-07-05 00:00:00','https://mp.weixin.qq.com/s/xWdGi0A3XYKyCLN3S8bgJg'),
  (64,'福州国际联合学院','福州国际联合学院','开营时间为8月12日-13日（暂定），以后续通知为准，招生计划为80-100人左右。','2025-08-01 00:00:00','https://fz.tju.edu.cn/info/1029/2214.htm'),
  (61,'网络空间安全学院','网络空间安全学院','复试时间为2025年9月中下旬—10月初，具体复试安排会在确定后通知进入复试名单的考生','2025-09-16 00:00:00','https://scss.bupt.edu.cn/info/1110/6070.htm'),
  (70,'电子信息学院','电子信息学院','_No response_','2025-07-26 00:00:00','https://ei.csu.edu.cn/info/1085/1924.htm'),
  (81,'计算机科学与技术学院','计算机科学与技术学院','第一批：2025年7月8日

第二批：2025年9月8日

第三批：2025年9月22日','2025-09-23 00:00:00','https://cst.hitwh.edu.cn/2025/0704/c371a202032/page.htm'),
  (21,'人工智能学院','人工智能学院','请符合报名要求的考生将电子版的申请材料发送到拟报考导师或课题组的相应电子邮箱， 并在中国科学院大学推免申请系统进行报名','2025-09-29 00:00:00','https://ai.ucas.ac.cn/index.php/zh-cn/tzgg/7535-2026-2'),
  (66,'蒙纳士大学（Monash University）苏州联合研究生院','蒙纳士大学（Monash University）苏州联合研究生院','一年6.2','2025-08-02 00:00:00','https://smjgs.seu.edu.cn/2025/0704/c8471a534961/page.htm'),
  (42,'软件学院','软件学院','预推免','2025-09-03 00:00:00','https://cs.nankai.edu.cn/info/1076/3424.htm'),
  (64,'All','All','预推免
智能与计算学部 | 7月31日；8月31日；9月10日
新媒体与传播学院 | 9月12日
医学院 | 8月1日；8月26日；9月8日
电气自动化与信息工程学院 | 7月24日；8月22日；9月12日
未来技术学院 | 7月24日；8月22日；9月12日
天津大学福州国际联合学院 | 9月12日','2025-09-11 00:00:00','https://mp.weixin.qq.com/s/WPEyVc9tOdvc8oJk4qXpbQ'),
  (82,'信息与电气工程学院','信息与电气工程学院','预推免','2025-08-10 18:00:00','https://ciee.cau.edu.cn/art/2025/7/8/art_50390_1075048.html'),
  (42,'计算机学院 && 密码与网络空间安全学院','计算机学院 && 密码与网络空间安全学院','预推免','2025-09-13 00:00:00','https://cc.nankai.edu.cn/2025/0708/c13297a575022/page.htm'),
  (70,'国家卓越工程师学院','国家卓越工程师学院','面试原则上采用线下考核，在中南大学岳麓山校区进行，具体时间及安排将通过电话或短信通知学生本人','2025-09-11 00:00:00','https://ngce.csu.edu.cn/info/1015/1392.htm'),
  (83,'计算机科学与技术','计算机科学与技术','_No response_','2025-07-11 09:00:00','https://cs.dlut.edu.cn/info/1256/5159.htm'),
  (83,'软件学院','软件学院','我院计划在9月下旬进行复试，具体时间及要求详见系统及钉钉群后续通知','2025-09-12 08:00:00','https://ss.dlut.edu.cn/info/1321/28201.htm'),
  (32,'前沿交叉科学院','前沿交叉科学院','通过初审的同学将在9月20日前分批次完成复试，复试具体安排各学科组另行通知','2025-09-15 12:00:00','https://sis.bit.edu.cn/tzgg/3594477160634d8f8d8d131228550c1c.htm'),
  (84,'网络空间安全学院','网络空间安全学院','预推免','2025-09-16 00:00:00','https://scs.njust.edu.cn/65/a5/c15612a353701/page.htm'),
  (85,'计算机科学与技术学院','计算机科学与技术学院','预推免','2025-09-10 17:00:00','https://cs.xidian.edu.cn/info/1003/21494.htm'),
  (86,'崂山国家实验室','崂山国家实验室','.“双一流”建设高校或国外相应层次的大三（2026年毕业）优秀本科生、2026年毕业应届硕士研究生、2026年计划通过硕博连读方式攻读博士研究生的联合培养高校在读硕士研究生。
实验室为营员报销国内出发地至青岛的双程交通费用，市内交通费不予报销，报销总额不超过1500元。双程交通仅限火车硬席（硬座、硬卧）、高铁/动车二等座、全列软席列车二等软座、飞机经济舱，乘坐飞机须提交行程单和登机牌，乘坐火车/高铁/动车等需打印报销凭证。','2025-07-29 00:00:00','https://mp.weixin.qq.com/s/neydFtAXJhrMdJrOCdldwQ'),
  (9,'统计与数据科学系','统计与数据科学系','预推免
报考“081200 计算机科学与技术”，笔试科目为数据结构和机器学习；
费用说明：预推免活动暂定以线下方式举行。我系将为异地学校营员提供预推免期间在深圳的免费食宿。最终在国家推免系统中确定录取的考生，以及能够提供高校贫困生认定凭证的家庭经济困难外地考生，可报销往返深圳的路费（最高不超过高铁二等座票价）。深圳地区高校考生原则上仅提供免费用餐，不安排住宿。','2025-08-15 16:00:00','https://stat-ds.sustech.edu.cn/notice/388.html'),
  (87,'控制与计算机工程学院','控制与计算机工程学院','复试时间：9月19日上午8:30开始','2025-09-15 09:00:00','https://cce.ncepu.edu.cn/tztg1/8594bf14899b416097c5b47a514cb2b8.htm'),
  (88,'物联网学院','物联网学院','线上','2025-07-19 17:00:00','https://ciot.njupt.edu.cn/2025/0712/c10653a287235/page.htm'),
  (44,'网络空间安全学院','网络空间安全学院','线上','2025-07-26 00:00:00','https://cybsec.jnu.edu.cn/2025/0714/c39579a840444/page.htm'),
  (85,'网络与信息安全学院','网络与信息安全学院','考生根据学院推免生接收复试工作安排，预报名系统导师审核为“通过”后，参加学院、导师组织的复试考核。考核时间预计9月下旬进行','2025-09-26 00:00:00','https://ce.xidian.edu.cn/info/1324/14383.htm'),
  (89,'信息学院','信息学院','线上','2025-07-24 00:00:00','http://www.ise.ynu.edu.cn/annunciations/312'),
  (90,'医学信息研究所','医学信息研究所','_No response_','2025-07-21 00:00:00','https://mp.weixin.qq.com/s/PGYfM9cOpJoQZFNvMgU60A?scene=1&click_id=1'),
  (12,'法学院','法学院','报名类型为法律硕士（非法学）“数字与科技法学、涉外法治”方向。数字与科技法学方向的申请者应为双一流高校的理工类专业三年级本科生（2026年应届毕业生）；涉外法治方向的申请者应为双一流高校的非法学类专业三年级本科生（2026年应届毕业生）且外语能力突出。','2025-08-10 23:00:00','https://law.nju.edu.cn/info/1088/17411.htm'),
  (91,'空天科技学院','空天科技学院','预推免','2025-09-04 00:00:00','http://issat.hitsz.edu.cn/currency.jsp?urltype=news.NewsContentUrl&wbtreeid=1079&wbnewsid=2881'),
  (85,'人工智能学院','人工智能学院','预推免
在“2026年推免生预报名”模块选择人工智能学院，按照报名要求填写相关信息，联系确认导师进行预报名','2025-09-25 00:00:00','https://sai.xidian.edu.cn/info/1106/12942.htm'),
  (92,'非公安学科','非公安学科','预推免
非公安学科（法学、国家安全学、法律、人工智能、大数据技术与工程）--英语笔试、专业面试','2025-08-26 00:00:00','https://yzb.ppsuc.edu.cn/info/1008/5064.htm'),
  (17,'海洋工程与技术学院','海洋工程与技术学院','预推免比较友好','2025-08-10 23:59:00','https://soet.sysu.edu.cn/zh-hans/article/1241'),
  (1,'SIGS电子信息（人工智能）','SIGS电子信息（人工智能）','预推免','2025-07-28 12:00:00','https://mp.weixin.qq.com/s/H_B_AuMBiJDQ0kt3jV-6Zg?click_id=1'),
  (17,'计算机学院','计算机学院','预推免','2025-08-16 23:59:00','https://cse.sysu.edu.cn/article/3279'),
  (86,'ALL','ALL','预推免','2025-09-15 00:00:00','http://yz.ouc.edu.cn/2025/0718/c31626a503423/page.htm'),
  (61,'人工智能学院','人工智能学院','9月中下旬，学院将通过邮件、电话、短信等途径发出复试通知','2025-09-17 00:00:00','https://ai.bupt.edu.cn/info/1065/4132.htm'),
  (93,'计算机与信息学院','计算机与信息学院','本科前五学期加权成绩排名在本专业前列【原则上以下院校学生优先：原一流大学建设高校（以2017年教育部等三部委公布的“双一流”建设高校名单为准）A类高校前40%、B类高校前30%，其他“双一流”建设高校（以2022年教育部等三部委公布的第二轮“双一流”建设高校名单为准）前5%】；或在科研创新、学科竞赛、社会实践等方面表现突出，有高水平成果【需在申请材料中显著注明并提供证明】','2025-07-26 00:00:00','https://ci.hfut.edu.cn/info/1063/15784.htm'),
  (94,'信息工程学院','信息工程学院','预推免','2025-09-02 00:00:00','https://mp.weixin.qq.com/s/e3r4FkQYbLzzwfWYPcWt_w'),
  (94,'理学院','理学院','预推免
也有0854','2025-08-11 00:00:00','https://mp.weixin.qq.com/s/L2aWIRI2zVq308Fu5n0J1w'),
  (95,'入伍','入伍','预推免','2025-07-31 00:00:00','https://mp.weixin.qq.com/s/QutGrQwGT1A1va7FE6zT2Q'),
  (96,'入伍','入伍','预推免
计算机科学与技术10个（直属单位四3个，直属单位五和直属单位九共5个，直属单位十2个）','2025-07-28 12:00:00','https://mp.weixin.qq.com/s/CdZ_gPl8mZV41Xe0f7Spcw?poc_token=HN6Me2ijwT-X9sJzgodImtjoBXR8bTpD1vpkBpib'),
  (97,'入伍','入伍','预推免','2025-07-31 00:00:00','https://mp.weixin.qq.com/s/guRKIHQbkkBpFDgvPNd5Sw'),
  (48,'1,2,3院入伍','1,2,3院入伍','预推免','2025-07-30 12:00:00','https://mp.weixin.qq.com/s/DV6mu92s0TY4p2chYlpnyA'),
  (98,'ALL','ALL','预推免','2025-09-30 18:00:00','https://yz.cqu.edu.cn/news/2025-07/2357.html'),
  (99,'信息科学学院暨语言智能研究院','信息科学学院暨语言智能研究院','_No response_','2025-07-28 00:00:00','https://mp.weixin.qq.com/s/pdu32JBRzEfhjUH_PAJxZg'),
  (85,'杭州卓越工程师学院(长三角基地)','杭州卓越工程师学院(长三角基地)','预推免','2025-09-19 12:00:00','https://hz.xidian.edu.cn/info/1009/20144.htm'),
  (9,'计算机科学与工程','计算机科学与工程','预推免','2025-09-01 00:00:00','https://cse.sustech.edu.cn/cn/news/view/id/1111?sessionid='),
  (21,'沈阳计算技术研究所','沈阳计算技术研究所','预推免','2025-10-20 00:00:00','http://yjs.sict.ac.cn/index.php?m=content&c=index&a=show&catid=15&id=165'),
  (85,'广州卓越工程师学院(粤港澳大湾区基地)','广州卓越工程师学院(粤港澳大湾区基地)','预推免','2025-09-19 00:00:00','https://gzyjy.xidian.edu.cn/info/1009/19512.htm'),
  (66,'生物科学与医学工程','生物科学与医学工程','BME夏令营','2025-07-31 12:00:00','https://bme.seu.edu.cn/2025/0630/c480a534639/page.htm'),
  (9,'电子与电气工程','电子与电气工程','预推免','2025-08-24 23:59:00','https://eee.sustech.edu.cn/news_detail.aspx?id=2144&cid=91'),
  (100,'入伍','入伍','预推免','2025-07-30 18:00:00','https://mp.weixin.qq.com/s/nh9hrXqMRUTjzifjhexq7g'),
  (101,'入伍','入伍','2026年计划招收推荐免试入伍攻读硕士研究生5人。招生学科专业：信息与通信工程、电子信息，各学科招生数量根据实际报名和复试情况确定。','2025-07-29 00:00:00','https://mp.weixin.qq.com/s/U9_6S09NTTnrVbzUqBlq8A'),
  (102,'信息科学与工程学院','信息科学与工程学院','预推免开始报名，但截止时间仅供参考，官方仍未公布','2025-09-28 00:00:00','http://csee.hnu.edu.cn/info/1062/13737.htm'),
  (1,'全球创新学院','全球创新学院','预推免','2025-07-28 12:00:00','https://mp.weixin.qq.com/s/nw3WIR8ZGpWMEVPs4Em2Tg'),
  (88,'计算机学院、软件学院、网络空间安全学院','计算机学院、软件学院、网络空间安全学院','“边缘智能与网络安全”暑期学校','2025-07-30 00:00:00','https://cs.njupt.edu.cn/2025/0623/c16083a286255/page.htm'),
  (103,'信息工程学院','信息工程学院','学院介绍、专业解读、研学活动、学术能力和专业实践能力评价','2025-08-15 10:00:00','https://xagx.zuel.edu.cn/2025/0726/c3402a403021/page.htm'),
  (19,'工程师学院','工程师学院','预推免','2025-09-11 00:00:00','https://pi.zju.edu.cn/2025/0727/c67026a3071730/page.htm'),
  (13,'(深圳)信息科学与技术学院','(深圳)信息科学与技术学院','预推免','2025-09-17 00:00:00','http://cist.hitsz.edu.cn/info/1038/2167.htm'),
  (13,'(深圳)计算机科学与技术学院','(深圳)计算机科学与技术学院','预推免','2025-08-30 00:00:00','http://cist.hitsz.edu.cn/info/1038/2168.htm'),
  (19,'计算机科学与技术学院','计算机科学与技术学院','预推免','2025-09-08 12:00:00','http://www.cs.zju.edu.cn/csen/2025/0728/c27006a3071976/page.htm'),
  (102,'人工智能与机器人学院','人工智能与机器人学院','预推免(未写明截止日期，时间仅供参考)','2025-09-29 00:00:00','http://robotics.hnu.edu.cn/info/1074/3111.htm'),
  (102,'网络空间安全学院','网络空间安全学院','预推免(未写明截止日期，时间仅供参考)','2025-09-29 00:00:00','http://cst.hnu.edu.cn/info/1053/1172.htm'),
  (104,'上海交通大学','上海交通大学','直博联培预推免','2025-09-17 00:00:00','https://mp.weixin.qq.com/s/TwQ0AXF7lS2_tFGP_JVqUg?click_id=3'),
  (104,'中国科学技术大学','中国科学技术大学','联培直博预推免','2025-09-17 00:00:00','https://mp.weixin.qq.com/s/_y8pplCy6hgSvJpf0bqxDA'),
  (85,'空间科学与技术学院','空间科学与技术学院','预推免','2025-09-20 00:00:00','https://sast.xidian.edu.cn/info/1014/13647.htm'),
  (105,'ALL','ALL','预推免','2025-09-11 00:00:00','http://yz.snnu.edu.cn/info/1009/7671.htm'),
  (106,'ALL','ALL','预推免','2025-08-29 00:00:00','https://yjsc.gxu.edu.cn/info/1021/4015.htm'),
  (107,'人工智能学院','人工智能学院','预推免','2025-09-03 23:59:00','https://www.cup.edu.cn/cupai/tzgg/d89506d4c98e47b087eba297909d2212.htm'),
  (3,'声学研究所','声学研究所','预推免(各研究单元将视名额情况择优进行分批面试。)','2025-09-29 00:00:00','http://ioa.cas.cn/yjs/zsxx/zstz/202508/t20250801_7900469.html'),
  (17,'智能工程学院','智能工程学院','预推免','2025-08-08 23:59:00','https://ise.sysu.edu.cn/article/1544'),
  (3,'自动化所','自动化所','预推免','2025-08-19 00:00:00','https://ia.cas.cn/yjsjy/zs/sszs/202507/t20250731_7899790.html'),
  (14,'信息学院','信息学院','预推免','2025-09-19 00:00:00','https://sist.shanghaitech.edu.cn/2025/0731/c7339a1113671/page.htm'),
  (108,'人工智能学院','人工智能学院','线上300人','2025-08-20 18:00:00','https://mp.weixin.qq.com/s/iv72_J2yIVplv9itTuu2Uw'),
  (42,'卓越工程师学院','卓越工程师学院','预推免','2025-09-08 00:00:00','https://yzxt.nankai.edu.cn/intern/frontend/web/pg-net-sign-up/index?id=27'),
  (3,'计算机网络信息中心','计算机网络信息中心','预推免','2025-09-08 00:00:00','https://cnic.cas.cn/yjsjy/zsxx/tjms/202508/t20250807_7901512.html'),
  (102,'国家卓越工程师学院','国家卓越工程师学院','预推免(动态接受，额满为止)','2025-09-29 00:00:00','https://ngcee.hnu.edu.cn/info/1083/3067.htm'),
  (109,'ALL','ALL','预推免','2025-09-11 00:00:00','https://mp.weixin.qq.com/s/gPjju3j2ltzFeajWt6LEUA'),
  (78,'智能科学与技术学院','智能科学与技术学院','预推免','2025-08-28 17:00:00','https://ai.ustb.edu.cn/xwgg/tzgg/79048df311dc467699ed5a356529d0a8.htm'),
  (19,'生物医学工程与仪器科学学院','生物医学工程与仪器科学学院','预推免','2025-09-11 00:00:00','http://www.cbeis.zju.edu.cn/2025/0806/c63837a3073268/page.htm'),
  (13,'苏州研究院','苏州研究院','研究院介绍、学术报告、学术工作坊、合作单位参观','2025-08-15 00:00:00','https://sri.hit.edu.cn/2025/0808/c17245a376222/page.htm'),
  (3,'云南天文台','云南天文台','预推免(提交申请后应保持手机畅通并经常登录查看通知以免延误考核)
截止时间  仅供参考','2025-09-29 00:00:00','https://ynao.cas.cn/yjsjy/jydt/zs/202507/t20250723_7894728.html'),
  (13,'（深圳）智能学部','（深圳）智能学部','预推免（学部将通过推免生信息采集系统及邮件（或其他形式）分批次通知学生审核通过情况）','2025-09-11 00:00:00','http://intelligence.hitsz.edu.cn/currency.jsp?urltype=news.NewsContentUrl&wbtreeid=1259&wbnewsid=1521'),
  (3,'成都计算所','成都计算所','预推免','2025-09-11 00:00:00','http://www.casit.ac.cn/tongzhi/308.html'),
  (52,'ALL','ALL','预推免
计算机与软件学院 | 2025-08-01 00:00:00至2025-09-15 09:00:00
人工智能与自动化学院 | 2025-08-01 08:00:00至2025-09-20 12:00:00
信息科学与工程学院|2025-08-01 08:00:00至2025-09-15 08:00:00','2025-09-21 00:00:00','https://gs.hhu.edu.cn/2025/0731/c17277a306121/page.htm'),
  (36,'ALL','ALL','预推免（前期已在该系统报名参加学院实验室开放日等活动的学生自动转为已报名（系统相同，账号密码一致），无需重复报名。所有学生如需信息修改，请在学院报名截止时间之前联系报考学院退回，修改后重新提交。）','2025-09-20 00:00:00','https://www.graduate.nuaa.edu.cn/2025/0802/c2145a380731/page.htm'),
  (3,'软件所','软件所','预推免
9月上旬，我所将对申请信息进行初审，择优确定面试学生名单，并通过邮件发送面试通知。通过初审的考生需及时在中科院推免系统中确认是否参加面试。未通过初审者恕不一一通知','2025-09-15 00:00:00','http://www.iscas.ac.cn/yjsjy2016/zsxx2016/202508/t20250811_7902397.html'),
  (12,'软件学院','软件学院','预推免','2025-09-10 23:59:59','https://software.nju.edu.cn//tzgg/20250811/i333050.html'),
  (24,'电影学院','电影学院','预推免（数字媒体系：081200 计算机科学与技术 | 085405软件工程）','2025-08-31 00:00:00','https://mp.weixin.qq.com/s/fG0Z5vndOtEDmiXK-DMkJQ'),
  (110,'电子与控制工程学院','电子与控制工程学院','预推免（我院将陆续对申请人报名信息进行资格初审，通过资格初审的申请人将进入推免复试环节。
我院接收2026年推免生的复试工作将分批次进行，具体复试安排以学院后续通知为准）','2025-09-29 00:00:00','http://ec.chd.edu.cn/info/1043/2502.htm'),
  (9,'创新创意设计学院','创新创意设计学院','预推免(0812)','2025-08-31 17:30:00','https://designschool.sustech.edu.cn/cn/admission/masters-admissions/744.html'),
  (12,'智能软件与工程学院','智能软件与工程学院','预推免','2025-09-10 23:59:59','https://ise.nju.edu.cn/info/1018/2671.htm'),
  (24,'信息学院（特色化示范性软件学院）','信息学院（特色化示范性软件学院）','预推免','2025-09-08 00:00:00','https://informatics.xmu.edu.cn/info/1050/47240.htm'),
  (48,'无军籍','无军籍','预推免','2025-08-30 12:00:00','https://mp.weixin.qq.com/s/XCqa11_TkmKwwYnrmSJqAw?scene=1&click_id=9'),
  (9,'创新创业学院','创新创业学院','预推免','2025-09-01 09:00:00','http://ie-school.sustech.edu.cn/page/content?id=690'),
  (24,'人工智能研究院','人工智能研究院','预推免','2025-09-08 00:00:00','https://mp.weixin.qq.com/s/JsslyHDDdjE7U-MnLJsZ8Q'),
  (83,'计算机科学与技术学院','计算机科学与技术学院','预推免','2025-09-16 00:00:00','http://cs.dlut.edu.cn/info/1256/5249.htm'),
  (3,'国家授时中心','国家授时中心','预推免','2025-09-20 00:00:00','http://www.ntsc.cas.cn/xwzx_/tzgg/202508/t20250819_7906891.html'),
  (111,'ALL','ALL','预推免','2025-09-26 00:00:00','http://www.yjszs.sdnu.edu.cn/info/1015/4675.htm'),
  (9,'国家卓越工程师学院','国家卓越工程师学院','预推免','2025-09-15 23:59:00','https://mp.weixin.qq.com/s/7Sa7Pw008VsKSFGBU7ycLw?click_id=5'),
  (112,'智能医学与技术学院','智能医学与技术学院','我单位将提供营员在海南期间的食宿和往返路费（共不超过1000元）；拟录取营员的食宿和往返路费在录取后会补齐差价','2025-08-27 00:00:00','https://www.muhn.edu.cn/xxjsb/info/1037/6105.htm'),
  (3,'微小卫星创新研究院','微小卫星创新研究院','预推免（预计在9月中旬开始分批进行，录满截止）','2025-09-29 00:00:00','https://www.microsate.ac.cn/yajsjy/sszsxx/202508/t20250820_7907973.html'),
  (3,'上海微系统与信息技术研究所','上海微系统与信息技术研究所','预推免（预计于9月中旬后分批进行）','2025-09-26 00:00:00','http://www.sim.cas.cn/yjs/zsxx/yjs_sszs/202508/t20250820_7907445.html'),
  (44,'ALL','ALL','预推免','2025-09-20 00:00:00','https://yz.jnu.edu.cn/2025/0721/c33059a840936/page.htm'),
  (75,'未来科学与工程学院','未来科学与工程学院','未来科学与工程学院2026年接收推免生的复试工作将分批次进行，具体复试安排将以邮件形式进行通知','2025-09-25 00:00:00','https://future.suda.edu.cn/46/53/c30836a673363/page.htm'),
  (72,'all','all','预推免','2025-09-16 17:00:00','http://yz.neu.edu.cn/2025/0827/c5932a290512/page.htm?sessionid='),
  (46,'计算机学院','计算机学院','预推免','2025-09-12 23:00:00','https://scse.buaa.edu.cn/info/1099/12024.htm'),
  (17,'系统科学与工程学院','系统科学与工程学院','预推免','2025-09-10 00:00:00','https://ssse.sysu.edu.cn/article/1375'),
  (30,'智能机器人与先进制造创新学院','智能机器人与先进制造创新学院','预推免','2025-09-10 16:00:00','https://ciram.fudan.edu.cn/5c/e9/c48843a744681/page.htm'),
  (84,'计算机学院/人工智能学院/软件学院','计算机学院/人工智能学院/软件学院','预推免
我校将分批审核申请信息，请及时登录系统查看审核状态，过审者请保持邮箱畅通以便接收后续信息。','2025-09-16 00:00:00','https://cs.njust.edu.cn/65/97/c1820a353687/page.htm'),
  (31,'ALL','ALL','预推免（三个志愿）我校各招生单位将于9月下旬起择优通知考生参加复试。具体复试时间、形式和复试录取办法将在各招生单位网站公布','2025-09-25 00:00:00','https://www.yz.sdu.edu.cn/info/1022/1225.htm'),
  (3,'深圳先进技术研究院','深圳先进技术研究院','预推免','2025-09-15 12:00:00','https://mp.weixin.qq.com/s/ocy_-FHezuu-CVDB6Zpb1g'),
  (110,'数据科学与人工智能研究院','数据科学与人工智能研究院','预推免（时间仅供参考）','2025-09-25 00:00:00','https://dsai.chd.edu.cn/info/1040/1242.htm'),
  (113,'计算机学院','计算机学院','预推免','2025-09-11 00:00:00','https://cee.hutb.edu.cn/p155/tzgg/20250822/172416.html'),
  (114,'信息工程学院','信息工程学院','预推免','2025-09-22 00:00:00','https://mp.weixin.qq.com/s/MDOvVSSois6DTwxjMR2E4g'),
  (113,'前沿交叉、人工智能与先进计算、智能机器人','前沿交叉、人工智能与先进计算、智能机器人','预推免','2025-09-11 00:00:00','https://qyjc.hutb.edu.cn/p117/tzgg/20250822/172417.html'),
  (115,'计算机学院','计算机学院','预推免','2025-09-01 18:00:00','https://jsjxy.cuit.edu.cn/info/1141/3135.htm'),
  (3,'计算所','计算所','预推免','2025-09-04 12:00:00','https://ict.cas.cn/yjsjy/zsxx/sszs/202508/t20250829_7946055.html'),
  (116,'ALL','ALL','复试时间拟定为9月18日-9月20日，具体安排请关注学院（研究院、实验室）通知。
从2023级研究生开始，我校对于专业学位研究生（专项计划除外）只提供第一年住宿','2025-09-11 20:00:00','https://yz.cuc.edu.cn/2025/0830/c8678a259447/page.htm'),
  (4,'先进制造与机器人学院','先进制造与机器人学院','预推免','2025-09-10 16:00:00','https://www.ere.coe.pku.edu.cn/jyjx/yjsjy/tzgg1/386cd74cffe04a79afac633c9d07815e.htm'),
  (31,'未来技术学院','未来技术学院','山东大学未来技术学院将于9月中下旬起择优通知考生参加复试。具体复试时间、形式和复试录取办法将在山东大学未来技术学院官网公布。','2025-09-14 17:00:00','https://sft.sdu.edu.cn/info/1010/1788.htm'),
  (117,'空间科学与技术学院','空间科学与技术学院','9月17日10:00前，空间科学与技术学院将根据学生报名情况择优发送复试通知','2025-09-15 17:00:00','https://apd.wh.sdu.edu.cn/info/1049/18700.htm'),
  (3,'上海天文台','上海天文台','预推免可视具体报名情况及高校实际情况适当延长','2025-09-11 00:00:00','http://www.shao.cas.cn/yjs/zsxx/202509/t20250901_7950411.html'),
  (118,'ALL','ALL','复试时间为9月23日-10月15日，具体时间以学校及招生学院通知为准','2025-10-16 00:00:00','https://yjs.qfnu.edu.cn/info/1044/4860.htm'),
  (16,'设计创意学院','设计创意学院','学院将在9月15日报名截止后统一审核并安排复试程序，各位同学届时请保持申请材料中填写的手机号和邮箱能畅通联系，以便通知审核结果','2025-09-16 00:00:00','https://mp.weixin.qq.com/s/3RA70SkTfF6VzJe9GdF2NA'),
  (70,'大数据研究院','大数据研究院','考核时间9月7日—8日','2025-09-04 00:00:00','https://bdi.csu.edu.cn/info/1063/3484.htm'),
  (119,'信息科学技术、人工智能学院','信息科学技术、人工智能学院','预推免','2025-09-21 00:00:00','https://it.njfu.edu.cn/wzsy/tzgg/20250901/i343033.html'),
  (31,'网络空间安全学院','网络空间安全学院','学院将根据考生报名情况于9月中下旬择优通知考生参加复试，具体复试时间、形式和复试录取办法将在学院网站公布','2025-09-12 17:00:00','https://cst.qd.sdu.edu.cn/info/1023/3733.htm'),
  (31,'浪潮人工智能学院','浪潮人工智能学院','学院将于9月中上旬起择优分批次通知考生参加复试。复试方式和复试内容将在本网站公布。','2025-09-11 17:00:00','https://www.ai.sdu.edu.cn/info/1088/1359.htm'),
  (16,'中意工程创新学院','中意工程创新学院','预推免（信息通信与具身智能085400）','2025-09-13 00:00:00','https://tjsic.tongji.edu.cn/info/1094/3778.htm'),
  (37,'ALL','ALL','预推免','2025-09-15 00:00:00','http://gs.ccnu.edu.cn/info/1028/5023.htm'),
  (43,'ALL','ALL','预推免','2025-09-19 09:00:00','https://gschool.ecust.edu.cn/2025/0826/c12754a181610/page.htm'),
  (66,'雷恩研究生学院','雷恩研究生学院','已入围东南大学夏令营的同学不可再次报名','2025-09-08 12:00:00','https://cs.seu.edu.cn/2025/0901/c49342a537970/page.htm'),
  (40,'智能教育研究院','智能教育研究院','预推免','2025-09-14 17:00:00','https://mp.weixin.qq.com/s/lYJL9qXYPMge3__C0hG7ow?click_id=13'),
  (31,'密码科学与工程学院','密码科学与工程学院','预推免','2025-09-15 17:00:00','https://cst.qd.sdu.edu.cn/info/1023/3736.htm'),
  (39,'ALL','ALL','深圳大学将派专人跟踪服务考生进行推免申报，每位考生可同时填报3个志愿。深圳大学依托地区经济发展优势，进一步加大经费投入力度，通过提高待遇水平，吸引优质生源，鼓励学生专心学业。例如，学校为推免生及直博生提供丰厚的奖学金，以全日制脱产方式学习的硕士推免生，第一年获得的奖助学金均不少于23000元（直博生参考2025级不少于56000元，2026级博士奖助学金体系待定），表现优异的将不少于12万元，如累计学校现有国家助学金、荔研优学奖学金、社会（企业）奖学金等，一年所获奖助学金可超过20万元','2025-10-20 00:00:00','https://yz.szu.edu.cn/info/1041/13406.htm?sessionid=165002247'),
  (40,'数据学院','数据学院','预推免','2025-09-12 12:00:00','https://mp.weixin.qq.com/s/UplaIQXFxboLGI-w7uR75g'),
  (120,'人工智能学院','人工智能学院','我院预推免将采用线下面试的形式。面试内容包括专业素质和能力测试50分、综合素质和能力测试30分、外语听说能力测试20分，总成绩为100分，面试分数低于60分为不合格。','2025-09-16 17:00:00','https://ai.swu.edu.cn/info/1109/3654.htm'),
  (120,'计算机与信息科学学院 软件学院','计算机与信息科学学院 软件学院','预推免','2025-09-16 00:00:00','https://cis.swu.edu.cn/info/1145/5473.htm'),
  (21,'工程科学学院','工程科学学院','预推免','2025-09-15 00:00:00','https://eng.ucas.ac.cn/index.php/zh-CN/xjgl-2/2702-2026'),
  (121,'ALL','ALL','我校将于9月中下旬起陆续开始复试资格审核，初审通过后，学院将联系考生通知具体复试时间及安排。','2025-09-19 00:00:00','https://yzw.gdut.edu.cn/info/1135/8125.htm'),
  (67,'光电与智能研究院','光电与智能研究院','预推免','2025-09-15 00:00:00','https://iopen.nwpu.edu.cn/info/1051/7246.htm'),
  (110,'信息工程学院','信息工程学院','1．登录长安大学推免生预报名系统（http://49.233.141.142/xly/login）填写有关信息、上传附件材料并提交申请。

2．推免申请者请务必加入信息工程学院2026级推免复试QQ群，群号：850045875，加群截至时间2025年9月15日前。

后续复试安排将在群内公布，申请加群方式为：姓名+学校。','2025-09-16 00:00:00','https://it.chd.edu.cn/2025/0901/c7382a254300/page.htm'),
  (49,'网络空间安全学院','网络空间安全学院','线下面试拟定于2025年9月14日进行','2025-09-10 17:00:00','https://cybersec.ustc.edu.cn/2025/0904/c23826a698699/page.htm'),
  (122,'信息工程学院','信息工程学院','预计9月17日线下复试','2025-09-14 00:00:00','http://ie.ncu.edu.cn/xydt/tzgg/d374ef8d4d314e099f408cdfdc704094.htm'),
  (123,'ALL','ALL','复试包括专业能力测试和综合能力测试、心理健康测试。专业能力测试考核程序设计（机试）内容。综合能力测试（面试）考查学生多方面的综合素质，着重考查学生科研创新潜力，对学科的认识、学科知识的综合应用能力，考生知识背景等。心理健康测试不计入复试成绩，仅作为参考依据，不参评考生不予录取。具体复试时间和安排以钉钉群（见问卷）通知为准','2025-09-19 00:00:00','https://www.besti.edu.cn/600/2471.html'),
  (124,'ALL','ALL','9月22日国家系统开通后，考生须登录“推免服务系统”正式填报我校相关专业志愿，并在系统内接收复试通知、待录取通知等','2025-09-19 16:00:00','https://yjsb.usts.edu.cn/info/1048/4317.htm'),
  (11,'计算机学院（网络空间安全学院、密码学院）','计算机学院（网络空间安全学院、密码学院）','“双一流”建设高校及建设学科的理工科专业本科四年级在校','2025-09-09 10:00:00','https://mp.weixin.qq.com/s/2rj_KZVFouiRkk72B5wToQ'),
  (54,'机器人学院','机器人学院','考核时间定于9月13日。具体时间、地点和形式通过QQ群通知。原则上武汉市内考生须线下参加考核，武汉市外考生可选择线上考核','2025-09-10 00:00:00','https://mp.weixin.qq.com/s/0p--_CJeVRM1ZikfyyQUAQ'),
  (125,'信息学部','信息学部','本次考核通过网络远程方式依托腾讯会议软件进行复试考核。符合条件的申请人持本人身份证按要求参加考核','2025-09-14 00:00:00','https://sist.lnu.edu.cn/info/12675/2112.htm'),
  (40,'空间人工智能学院','空间人工智能学院','预推免','2025-09-10 15:00:00','https://mp.weixin.qq.com/s/OrwEpKQiLbaXvaoofWy0UQ'),
  (40,'软件工程学院（滴水湖国际软件学院）','软件工程学院（滴水湖国际软件学院）','预推免','2025-09-12 09:00:00','https://mp.weixin.qq.com/s/qkHOE03KwFUA0RF4i5F04w?click_id=110&scene=1'),
  (50,'基础与前沿研究院','基础与前沿研究院','“基础与前沿科学”夏令营优秀营员仍需在系统里报名并参加统一考核；','2025-09-11 12:00:00','https://www.iffs.uestc.edu.cn/info/1049/6804.htm'),
  (70,'自动化学院','自动化学院','9月12日-9月14日线下面试','2025-09-09 20:00:00','https://soa.csu.edu.cn/info/1032/9027.htm'),
  (54,'计算机学院','计算机学院','我院考核采用线上线下相结合的方式，具体以QQ群中发布的时间安排为准。

获得我院A营员且有意愿攻读我院研究生的推免生必须在预推免系统中报名，可优先进入推免复试名单','2025-09-10 14:00:00','https://cs.whu.edu.cn/info/1071/55981.htm'),
  (49,'工程硕博士培养改革专项','工程硕博士培养改革专项','暂定9月17日前完成考核，三个工作日左右发布考核结果（未通过本专项考核的考生，如果符合条件，可继续申请其他推免招生）','2025-09-10 18:00:00','https://yz.ustc.edu.cn/article/2796/182?num=-1'),
  (126,'ALL','ALL','考核时间拟定为9月17日-9月19日。报名截止后，学院会根据考生报名信息和提交的补充材料（如需）进行复试资格评定，并依据招生名额和资格评定成绩给予考生复试资格。复试比例原则上不超过500%。','2025-09-14 17:00:00','https://gs.cufe.edu.cn/info/1028/6394.htm'),
  (32,'网络空间安全学院','网络空间安全学院','各学科方向组织面试，面试内容及方式由各方向独立确定','2025-09-14 00:00:00','https://cst.bit.edu.cn/xxfw/tzgg/85651741e5be49e5b64a99b254ca6770.htm'),
  (127,'ALL','ALL','珠海校区根据申请情况，对申请人提交的材料进行评审，审核通过后，由专人通知申请人考核时间和具体要求。','2025-09-10 00:00:00','https://zh.bit.edu.cn/info/2871/20321.htm'),
  (122,'软件学院','软件学院','预推免复试日程安排：2025年9月中旬（具体时间另行通知），复试采取线下的形式进行','2025-09-16 00:00:00','https://soft.ncu.edu.cn/xydt/tzgg/50c82e663e2444f8b30b5cfba9ddcbc5.htm'),
  (11,'自动化与感知学院','自动化与感知学院','已获得我院2025年7月优秀生源身份的同学本轮不需要再报名，7月硕士优秀生源的同学欲报名，需先放弃硕士优秀生源资格','2025-09-10 10:00:00','https://mp.weixin.qq.com/s/_mn0ScGru9t_wYINKG6WIA'),
  (12,'南京大学计算机学院','南京大学计算机学院','工程硕博专项','2025-09-10 23:59:59','https://table.nju.edu.cn/apps/custom/gs-engineering-program/?page_id=pXAD'),
  (54,'国家网络安全学院','国家网络安全学院','非校园网用户可访问系统时间为6:00-24：00','2025-09-13 12:00:00','https://cse.whu.edu.cn/info/2501/40801.htm'),
  (46,'网络空间安全学院','网络空间安全学院','综合面试总成绩300分，英语能力、数理基础和专业基础中，任一项低于60分或思想政治素质和品德考核不合格，不予拟录取。','2025-09-14 23:00:00','https://cst.buaa.edu.cn/info/1071/4308.htm'),
  (126,'信息学院','信息学院','考核时间拟定为9月17日-9月19日。','2025-09-14 17:00:00','https://ie.cufe.edu.cn/info/1069/7048.htm'),
  (98,'国家卓越工程师学院','国家卓越工程师学院','线下/线上面试。9月中下旬，具体时间及安排另行通知','2025-09-17 12:00:00','https://eie.cqu.edu.cn/info/1483/3507.htm'),
  (49,'卓越工程师学院（先进技术研究院）','卓越工程师学院（先进技术研究院）','_No response_','2025-09-17 23:59:59','https://iat.ustc.edu.cn/iat/x198/20250903/7571.html'),
  (49,'电子工程与信息科学系','电子工程与信息科学系','_No response_','2025-09-15 23:59:59','https://eeis.ustc.edu.cn/2025/0903/c2702a698535/page.htm'),
  (19,'基础交叉博士生专项','基础交叉博士生专项','基础交叉直博生
各院系报名开始和截止时间、联系方式及报考说明请见2026年各院系免试生报考说明','2025-09-22 00:00:00','https://futre.zju.edu.cn/2025/0906/c83566a3078113/page.htm'),
  (128,'信息科学与技术学院','信息科学与技术学院','本次复试只采取现场面试形式。面试时间定于2025 年9 月15日-19日之间。视情况可能组织的第二次面试将安排于9 月22 日之后。具体安排将另行通知','2025-09-15 17:00:00','https://graduate.buct.edu.cn/_upload/article/files/78/9e/c4a680c84d17857554739f806ea5/8ddc3af4-3396-43c8-8cb3-e713f7b79184.pdf'),
  (22,'All','All','预推免','2025-09-16 00:00:00','https://yz.xjtu.edu.cn/2026tmzc.pdf'),
  (31,'低空科学与工程学院','低空科学与工程学院','计算机学科：机试；时间地点：另行通知

面试时间19日8:00；地点：知行北楼515','2025-09-14 17:00:00','https://ie.wh.sdu.edu.cn/info/1031/1439.htm'),
  (129,'人工智能与数据科学学院','人工智能与数据科学学院','复试形式初步定为线下，学院将根据报名情况分批次及时安排复试。

复试时间预计为2025年9月20日，具体复试时间和复试形式另行邮件或QQ群内通知。','2025-09-17 00:00:00','https://ai.hebut.edu.cn/rcpy/yjspy/yjszsgz/2fd5b2783ca5460e82dd38c71b878e9a.htm'),
  (41,'软件学院','软件学院','_No response_','2025-09-13 00:00:00','http://rjxy.bjtu.edu.cn/cms/item/1083.html'),
  (65,'计算机科学与技术学院','计算机科学与技术学院','预推免','2025-09-21 21:00:00','https://cstc.hrbeu.edu.cn/2025/0908/c3688a340748/page.htm'),
  (41,'计算机学院','计算机学院','_No response_','2025-09-13 00:00:00','https://cs.bjtu.edu.cn/zsjy/yjszs3/yjszs_sszs/d91fc1058e764e48ae137b259cb0f3fe.htm'),
  (46,'人工智能学院','人工智能学院','复试时间暂定在9月20日，复试以现场复试的形式进行综合面试，面试时间不少于20分钟（不含宣读诚信复试承诺书等时间，考生明确表示已作答完毕的可提前结束考核）。若因不可抗力因素无法参加现场复试，可提交由考生亲笔签名的书面申请，经学院招生工作小组审议通过后，方可进行线上面试','2025-09-16 10:00:00','https://iai.buaa.edu.cn/info/1062/4205.htm'),
  (32,'人工智能学院','人工智能学院','通过初审的同学将在9月22日前完成复试，在保证复试内容要求一致的前提下，将采取面试的复试方式','2025-09-16 00:00:00','https://mp.weixin.qq.com/s/tN6SG8pf3ThcfYrDp6cM2A'),
  (22,'电子与信息学部计算机科学与技术学院','电子与信息学部计算机科学与技术学院','已参加我院科研团队考核的考生，不再参加复试考核，直接通过教育部推免服务系统完成报名录取流程','2025-09-15 12:00:00','http://www.cs.xjtu.edu.cn/info/1233/3749.htm'),
  (30,'多个','多个','_No response_','2025-09-08 16:00:00','https://gsao.fudan.edu.cn/5f/32/c15014a745266/page.htm'),
  (49,'人工智能与数据科学学院','人工智能与数据科学学院','面试拟定于2025年9月15日-18日期间进行，具体时间安排及详细流程将通过邮件通知，请考生密切关注','2025-09-12 00:00:00','https://saids.ustc.edu.cn/2025/0907/c15435a699114/page.htm'),
  (130,'人工智能学院','人工智能学院','复试时间：2025 年 9 月 18 日上午 8:30-10：30 笔试，下午 13：00-18：00 面试。参加复试人员为在我校“推免服务系统”报名、审核通过并缴费的同学，请携带身份证原件参加笔试','2025-09-15 14:00:00','https://bm.cugb.edu.cn/yjsyzsb/c/2025-09-09/831681.shtml'),
  (131,'智能科学与技术学院','智能科学与技术学院','学院对接收到的申请材料将组织招生专家进行初审，并按批次组织复试。复试考核内容主要包括思想政治品德考核、专业知识和外语水平的考核。复试具体安排后续通知，请考生留意学院官网、个人邮箱和移动电话','2025-09-17 17:00:00','http://hias.ucas.ac.cn/znkxyjs/info/1118/1426.htm'),
  (11,'生物医学工程学院','生物医学工程学院','复试预计安排在9月中旬进行，具体安排入围后邮件通知，请留意查收邮件','2025-09-13 00:00:00','https://bme.sjtu.edu.cn/Web/Show/3999'),
  (11,'计算机学院工程硕博士培养改革专项','计算机学院工程硕博士培养改革专项','复试方式为面试选拔，预计9月17日在交大闵行校区进行，具体安排以后续通知为准。结果通知预计在9月20日前发布','2025-09-11 18:00:00','https://mp.weixin.qq.com/s/oe46CquMOw6UsdjAEk4fDQ'),
  (132,'计算机科学与技术学院/人工智能学院','计算机科学与技术学院/人工智能学院','报到时间：2025 年 9 月 17 日下午 2:00---5:00
报到地点：南湖校区计算机楼五层 A521
面试时间：2025 年 9 月 18 日上午 9:00--
面试地点：南湖校区计算机楼（根据实际人数确定地点）
截止时间请以报名系统为准https://yzs.cumt.edu.cn/yzbm/logon','2025-09-19 00:00:00','https://cs.cumt.edu.cn/info/1072/6637.htm'),
  (3,'重庆研究院','重庆研究院','申请人按照规定的时间参加复试考核，考核方式和具体时间安排以邮件通知为准。考核内容主要包括思想政治品德、专业素质和能力测试、外国语听力和口语测试以及体检。','2025-09-27 00:00:00','https://cigit.cas.cn/yjsjy/bszs/bsjz/202509/t20250910_7964574.html'),
  (50,'信息与软件工程学院','信息与软件工程学院','9月18日线下复试（含直博生）沙河校区主楼中、主楼东','2025-09-15 09:00:00','https://sise.uestc.edu.cn/info/1026/13675.htm'),
  (22,'电子与信息学部软件学院','电子与信息学部软件学院','推免生报名工作结束后，我院将组织专家对所有推免生报名同学进行复试，复试通过的同学确认为预接收（拟录取/预录取），在教育部正式推免系统开放后不再参加考核，直接通过系统完成报名录取流程','2025-09-16 00:00:00','https://se.xjtu.edu.cn/info/1043/3507.htm'),
  (22,'人工智能学院','人工智能学院','本次报名为学校推免服务系统报名。后续考核及录取安排，以学院具体细则通知为准','2025-09-15 23:59:00','https://iair.xjtu.edu.cn/info/1004/3815.htm'),
  (41,'自动化与智能学院','自动化与智能学院','9月17日前，复试小组通过邮件、电话、短信等途径发出复试通知，复试具体时间、方式等信息也由复试小组告知。学校的“推免预报名系统”我院仅用于前期复试信息采集，学院不会在复试前通过该系统发放复试通知','2025-09-13 00:00:00','https://ai.bjtu.edu.cn/tzgg/rcpytzgg/6daa2449b6964e0499952dd1eeb6f561.htm'),
  (133,'青岛软件学院、计算机科学与技术学院','青岛软件学院、计算机科学与技术学院','各导师组审核申请者信息并对通过审核的学生组织复试，复试考核方式为面试，具体安排由导师通知','2025-09-19 00:00:00','https://computer.upc.edu.cn/2025/0909/c21961a470450/page.htm'),
  (69,'计算机与信息技术学院','计算机与信息技术学院','预推免','2025-09-20 12:00:00','https://mp.weixin.qq.com/s/8GvXNZpc-r3s_hjfxusrFQ'),
  (39,'大湾区国际创新学院和人工智能学院联培','大湾区国际创新学院和人工智能学院联培','预推免','2025-09-10 00:00:00','https://mp.weixin.qq.com/s/Iu2aVKksz6OvgEYMZt-BAA'),
  (134,'ALL','ALL','Wali母校，强推荐','2025-10-21 00:00:00','https://yjszs.ntu.edu.cn/2025/0909/c7625a272390/page.htm'),
  (50,'计算机科学与工程学院（网络空间安全学院）','计算机科学与工程学院（网络空间安全学院）','预推免','2025-09-17 12:00:00','https://www.scse.uestc.edu.cn/info/1015/17362.htm'),
  (135,'信息工程学院','信息工程学院','预推免','2025-09-17 00:00:00','https://iec.cnu.edu.cn/ggml/tzgg1/3a8a745d4df8418db39756a30af2262e.htm'),
  (60,'人工智能与计算机学院（软件学院）','人工智能与计算机学院（软件学院）','填报“江南大学推荐免试硕士研究生预报名系统”并审核通过的考生，学院在9月22日之前分批组织线上或线下面试，具体时间将电话通知本人；在“推免服务系统”开通后报名的考生，在复试通知发出并得到确认回复后的48小时之内将会电话通知考生本人，考生则在规定时间进行面试。','2025-09-23 00:00:00','https://ai.jiangnan.edu.cn/info/1055/4435.htm'),
  (136,'华北计算机系统工程研究所','华北计算机系统工程研究所','对通过审核同意复试的推免生，在规定时间内确定名单并通过“推免服务系统”发送复试通知','2025-09-23 00:00:00','https://mp.weixin.qq.com/s/_gEAmx9Z3cHI6YHi5grskg'),
  (137,'医学信息与人工智能学院','医学信息与人工智能学院','9月15日上午开展第一批次复试工作(线上或线下复试)，后续复试批次另行通知，最迟为9月21日当天（视剩余名额情况确定）','2025-09-15 00:00:00','https://mp.weixin.qq.com/s/MotRogDVpJF3pzL6LImGig'),
  (45,'软件学院','软件学院','考生报到时间：9 月18 日9:00-11:00
机试时间：9 月18 日14:20-17:00
面试时间：9 月19 日08:30-18:30','2025-09-15 18:00:00','https://gszs.hust.edu.cn/info/1106/4010.htm'),
  (50,'智能计算研究院','智能计算研究院','9月20日上午9:00开始硕士复试','2025-09-17 12:00:00','https://icct.uestc.edu.cn/info/1029/1995.htm'),
  (138,'人工智能与音乐信息科技方向','人工智能与音乐信息科技方向','a.评委将通过面试进一步考查考生的专业能力、研究计划、英语能力、思想政治素质和道德品质考核等情况；

b.考生须在面试过程中进行音乐能力展示，可演奏某种乐器或演唱等。','2025-09-19 12:00:00','https://www.ccom.edu.cn/info/10711/257131.htm'),
  (121,'计算机学院','计算机学院','我校将于9月中下旬起陆续开始复试资格审核，初审通过后，学院将联系考生通知具体复试时间及安排','2025-09-19 00:00:00','https://cs.gdut.edu.cn/info/2318/5302.htm'),
  (139,'计算机系','计算机系','1. 形式：现场面试。

2. 时间：2025年9月19日14：30（面试地点另行通知）','2025-09-15 17:30:00','https://cs.ncepu.edu.cn/xwdt/tz/b531fa77f0354aefaaf97084a8f1c2a9.htm'),
  (98,'大数据与软件学院','大数据与软件学院','考核采取线下现场综合面试方式，面试地点为重庆大学虎溪校区，请参加考核的推免生提前做好交通、住宿等相应准备','2025-09-15 00:00:00','https://mp.weixin.qq.com/s/TaoiaGKNdfQLcmqDwPo0Rw?scene=1&click_id=12'),
  (3,'信息工程研究所','信息工程研究所','布什鸽们，iie你不来？
已参加过信工所2025年夏令营并获得优营的同学，本次请勿报名，截止时间仅供参考，官网并未提及
信工所将对完成网上报名的考生进行初审。通过初审的考生需按照信工所考核通知提交材料和参加考核（具体以邮件通知为准，未通过初审的不予通知）','2025-09-22 00:00:00','http://www.iie.ac.cn/xsjy2020/zxtz2020/202509/t20250911_7965947.html'),
  (71,'ALL','ALL','各学院（中心）定期对申请信息集中审核，根据申请学生情况及时遴选、确定复试名单、发送复试通知、分批组织复试、择优录取。复试时间预计集中在9月，具体时间及相关安排由学院（中心）自行组织。请关注东华大学研招网及各学院（中心）网站公告','2025-09-23 00:00:00','https://yjszs.dhu.edu.cn/2025/0829/c7127a364605/page.htm'),
  (140,'ALL','ALL','我校的推免生复试录取工作一般会在国家推免服务系统开通后几天内结束，请考生尽早报名并及时关注我校官网和招生学院网站','2025-09-20 16:00:00','https://yjszs.shu.edu.cn/info/1004/7404.htm'),
  (33,'ALL','ALL','有意申请兰州大学推荐免试攻读研究生的学生，可登录兰州大学推免生预接收报名系统（https://yjszs.lzu.edu.cn/lzuyjsytms/）填报相关信息，由学院通知审核通过的学生参加考核，考核通过并获得所在学校推免资格的学生','2025-09-22 00:00:00','https://yz.lzu.edu.cn/shuoshishengzhaosheng/tuijianmianshi/2025/0903/315679.html'),
  (93,'ALL','ALL','学院将根据上级政策开展考核选拔工作，具体时间及工作安排请关注学院通知。申请人须在“全国推荐免试攻读研究生（免初试、转段）信息公开管理服务系统”正式报名，完成填报志愿、接受复试确认、接受待录取确认等环节，服务系统开放时间请关注中国研究生招生信息网相关公告','2025-09-15 17:00:00','http://yjszs.hfut.edu.cn/2025/0902/c13524a314363/page.htm'),
  (53,'信息科学与技术学院','信息科学与技术学院','申请加入“信息学院2026届推免意向征集通知群”，群QQ号为：584445645，进群需要用“姓名+本科学校名称”进行验证。此群仅作通知使用','2025-09-18 20:00:00','https://mp.weixin.qq.com/s/5vExE01EF5M7ORLiSRw8Lg'),
  (141,'信息学院','信息学院','预推免','2025-09-15 00:00:00','https://coi.hzau.edu.cn/info/1611/52871.htm'),
  (142,'计算机与人工智能学院','计算机与人工智能学院','复试形式为网络远程复试','2025-09-19 11:00:00','https://yjsc.nufe.edu.cn/info/1011/6661.htm'),
  (143,'ALL','ALL','考生接到复试通知后，在规定时间内通过教育部推免服务系统确认是否同意复试。
同意参加我校复试的申请人，在规定时间内，按照招生学院安排参加电话面试、网上面试或实地面试。面试时按招生学院要求携带相关材料。','2025-10-21 00:00:00','https://mp.weixin.qq.com/s/p_vAmRvFVbroXZveASwn_g'),
  (144,'计算机与大数据学院软件学院','计算机与大数据学院软件学院','我院确定2026年招收直博生、硕士推免生复试工作采用现场机试和现场面试方式进行','2025-09-16 17:00:00','https://ccds.fzu.edu.cn/info/1138/11337.htm'),
  (50,'（深圳）高等研究院','（深圳）高等研究院','复试采用现场面试形式，分组安排将在QQ群公布','2025-09-15 20:00:00','https://mp.weixin.qq.com/s/iR90rDlnuJrJbxUp-Th3TQ'),
  (145,'计算机学院（软件学院）、人工智能学院','计算机学院（软件学院）、人工智能学院','9.23复试','2025-09-23 00:00:00','https://ccs.imu.edu.cn/info/1051/2580.htm'),
  (146,'ALL','ALL','复试工作原则上在9月22日-10月15日完成，具体复试安排由学院自行确定。','2025-10-21 00:00:00','https://grad.qdu.edu.cn/info/1118/4229.htm'),
  (147,'人工智能与计算机学院','人工智能与计算机学院','略神的母校
复试时间为2025年9月下旬—10月中旬，各批次具体复试安排以研招网复试通知为准。','2025-10-21 00:00:00','https://csci.ncut.edu.cn/info/1086/4763.htm'),
  (143,'计算机与人工智能学院','计算机与人工智能学院','预计时间为2025年9月19日（如有调整另行通知），具体安排由考务组通过电子邮箱提前告知','2025-09-18 17:00:00','http://cst.whut.edu.cn/yjsjy/zsxx/202509/t20250915_1349104.shtml'),
  (148,'计算机与人工智能学院、软件学院','计算机与人工智能学院、软件学院','面试时间：按照中国研究生招生信息网系统报名时间确定。','2025-09-20 18:00:00','https://www7.zzu.edu.cn/csai/info/1147/3573.htm'),
  (140,'未来技术学院','未来技术学院','我院暂定于2025年9月18日（周四）全天开展复试工作，具体复试时间以复试通知为准','2025-09-18 00:00:00','https://ai.shu.edu.cn/info/1087/3568.htm'),
  (149,'计算机科学与技术学院（大数据学院）','计算机科学与技术学院（大数据学院）','研究生院通过该“推免系统”和学院报送的接收名单审核推免生报名志愿，对符合申请条件者发送复试通知、待录取通知','2025-09-20 00:00:00','https://ccst.tyut.edu.cn/info/2123/13911.htm'),
  (150,'ALL','ALL','温特母校！极力推荐！！！','2025-09-19 12:00:00','https://yjsy.sdust.edu.cn/zhaosheng/info/1090/1840.htm');

-- --------------- 迁移：为已存在的 users 表添加 created_at（若报 Unknown column 'created_at' 可执行） ---------------
-- ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间';

