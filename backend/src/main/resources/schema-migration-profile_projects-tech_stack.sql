-- 迁移：为 profile_projects 表添加 tech_stack 字段
-- 使用场景：数据库是早期建表、缺少 tech_stack 时，报错 Unknown column 'tech_stack' in 'profile_projects'
-- 执行方式：在 MySQL 客户端或 Navicat 等工具中执行本文件，或：mysql -u root -p your_db < schema-migration-profile_projects-tech_stack.sql

ALTER TABLE profile_projects ADD COLUMN tech_stack VARCHAR(500) NULL COMMENT '技术栈列表，存 JSON 数组字符串';
