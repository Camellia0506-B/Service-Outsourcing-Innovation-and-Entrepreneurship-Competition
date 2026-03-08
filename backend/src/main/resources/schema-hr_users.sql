USE gradquest;

DROP TABLE IF EXISTS hr_users;

CREATE TABLE hr_users (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  username        VARCHAR(100) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  real_name       VARCHAR(50) NOT NULL,
  company_name    VARCHAR(100) NOT NULL,
  company_size    VARCHAR(50) NULL,
  industry        VARCHAR(50) NULL,
  hr_role         VARCHAR(50) NULL,
  business_license VARCHAR(255) NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hr_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
