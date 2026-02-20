-- 1.4 忘记密码验证码表（API 文档 1.4）
-- 执行一次即可
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(16) NOT NULL,
    expire_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_expire_at (expire_at)
);
