-- Create a MySQL schema based on database.md (utf8mb4 + InnoDB)
-- Generated: 2025-12-28
-- Notes:
-- 1) The spec says users.password is stored in plaintext; strongly recommend storing a salted hash instead.
-- 2) Adjust sizes / constraints as needed for your app.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS forum_comments;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS shared_resources;
DROP TABLE IF EXISTS camp_notices;
DROP TABLE IF EXISTS user_follows;
DROP TABLE IF EXISTS app_daily_content;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS universities;

SET FOREIGN_KEY_CHECKS = 1;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='高校基本信息';

-- 6. 用户表
CREATE TABLE users (
  id        BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  username  VARCHAR(50) NOT NULL COMMENT '用户名/账号',
  password  VARCHAR(255) NOT NULL COMMENT '密码(建议存储哈希，不要明文)',
  nickname  VARCHAR(50) NULL COMMENT '昵称(显示在帖子中)',
  avatar    VARCHAR(255) NULL COMMENT '头像链接',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户';

-- 2. 招生通知表
CREATE TABLE camp_notices (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  univ_id     INT NOT NULL COMMENT '外键，关联 universities.id',
  dept_name   VARCHAR(100) NULL COMMENT '学院名称',
  title       VARCHAR(255) NOT NULL COMMENT '通知标题',
  content     TEXT NULL COMMENT '通知正文(纯文本或HTML)',
  end_date    DATETIME NULL COMMENT '截止日期(排序/筛选)',
  source_link VARCHAR(255) NULL COMMENT '原文链接(跳转官网用)',
  PRIMARY KEY (id),
  KEY idx_camp_notices_univ_id (univ_id),
  KEY idx_camp_notices_end_date (end_date),
  CONSTRAINT fk_camp_notices_univ
    FOREIGN KEY (univ_id) REFERENCES universities(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='招生通知';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='论坛帖子';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子评论';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='共享资料';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户关注';

-- 8. 每日/全局配置表
CREATE TABLE app_daily_content (
  id       INT NOT NULL COMMENT '主键(固定为1或少量行)',
  date     DATE NOT NULL COMMENT '日期',
  quote    VARCHAR(255) NULL COMMENT '每日一句/祝福语',
  bg_image VARCHAR(255) NULL COMMENT '每日背景图url',
  PRIMARY KEY (id),
  UNIQUE KEY uk_app_daily_content_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每日/全局配置';
