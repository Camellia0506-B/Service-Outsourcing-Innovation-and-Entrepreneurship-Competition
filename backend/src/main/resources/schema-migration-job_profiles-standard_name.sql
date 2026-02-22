-- 岗位名称标准化：新增 standard_name，不修改原有 job_name
-- 用途：关联图谱按 standard_name 分组、搜索模糊匹配（如搜「算法工程师」匹配所有细分方向）
-- 岗位列表继续使用 job_name，不受影响
-- 执行：MySQL 8.0+ 支持 REGEXP_REPLACE；若为 5.7 可只执行 ALTER 与手动或简单 UPDATE

ALTER TABLE job_profiles ADD COLUMN standard_name VARCHAR(100) NULL COMMENT '标准化名称，用于图谱分组与搜索匹配';

-- 从 job_name 去括号后填入 standard_name（MySQL 8.0+）
UPDATE job_profiles SET standard_name = TRIM(REGEXP_REPLACE(job_name, '\\(.*\\)', ''))
WHERE standard_name IS NULL OR standard_name = '';

-- 若 REGEXP_REPLACE 不可用（如 MySQL 5.7），可改用：
-- UPDATE job_profiles SET standard_name = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(CONCAT(job_name, '('), '(', 1), '(', -1));
