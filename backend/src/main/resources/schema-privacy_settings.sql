-- 隐私设置表
-- 创建隐私设置表
USE gradquest;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 先删表
DROP TABLE IF EXISTS privacy_settings;

-- 隐私设置表
CREATE TABLE privacy_settings (
  id                          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  user_id                     BIGINT NOT NULL COMMENT '用户ID，关联users.id',
  resume_visible_to_hr       BOOLEAN NOT NULL DEFAULT FALSE COMMENT '简历是否对HR可见',
  allow_hr_contact            BOOLEAN NOT NULL DEFAULT FALSE COMMENT '允许HR发起评估邀请',
  allow_algorithm_optimization BOOLEAN NOT NULL DEFAULT TRUE COMMENT '允许数据用于平台算法优化',
  allow_research           BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否允许用于学术研究（脱敏后）',
  data_retention_years     INT NOT NULL DEFAULT 3 COMMENT '数据保留年限（1/3/5年）',
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_privacy_user_id (user_id),
  CONSTRAINT fk_privacy_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户隐私设置';

-- 数据访问日志表
DROP TABLE IF EXISTS data_access_logs;

CREATE TABLE data_access_logs (
  id                          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  user_id                     BIGINT NOT NULL COMMENT '用户ID，关联users.id',
  access_type                VARCHAR(50) NOT NULL COMMENT '访问类型',
  accessor_info              TEXT NULL COMMENT '访问者信息（JSON格式）',
  accessed_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  PRIMARY KEY (id),
  KEY idx_access_user_id (user_id),
  KEY idx_accessed_at (accessed_at),
  CONSTRAINT fk_access_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='数据访问日志';

SET FOREIGN_KEY_CHECKS = 1;
