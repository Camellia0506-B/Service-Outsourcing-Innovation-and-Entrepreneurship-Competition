package www.gradquest.com.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * 启动时检查并执行数据库迁移：为 profile_projects 表添加 tech_stack 字段（若不存在）。
 * 使用 application.yml 中的 datasource 连接执行 ALTER TABLE。
 */
@Component
@Order(1)
public class DbMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DbMigrationRunner.class);

    private final DataSource dataSource;

    public DbMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateProfileProjects();
        migrateHrUsers();
        migratePrivacySettings();
        migrateDataAccessLogs();
    }
    
    private void migrateProfileProjects() {
        String checkSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profile_projects' AND COLUMN_NAME = 'tech_stack'";
        String alterSql = "ALTER TABLE profile_projects ADD COLUMN tech_stack VARCHAR(500) NULL COMMENT '技术栈列表'";
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery(checkSql)) {
                if (rs.next() && rs.getInt(1) > 0) {
                    log.info("[DbMigration] profile_projects.tech_stack already exists, skip");
                    return;
                }
            }
            st.executeUpdate(alterSql);
            log.info("[DbMigration] Added column profile_projects.tech_stack");
        } catch (Exception e) {
            log.warn("[DbMigration] Migration for profile_projects skipped or failed: {}", e.getMessage());
        }
    }
    
    private void migrateHrUsers() {
        String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_users'";
        String createTableSql = """
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            """;
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery(checkTableSql)) {
                if (rs.next() && rs.getInt(1) > 0) {
                    log.info("[DbMigration] hr_users table already exists, skip");
                    return;
                }
            }
            st.executeUpdate(createTableSql);
            log.info("[DbMigration] Created table hr_users");
        } catch (Exception e) {
            log.warn("[DbMigration] Migration for hr_users skipped or failed: {}", e.getMessage());
        }
    }
    
    private void migratePrivacySettings() {
        String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'privacy_settings'";
        String createTableSql = """
            CREATE TABLE privacy_settings (
              id                          BIGINT NOT NULL AUTO_INCREMENT,
              user_id                     BIGINT NOT NULL,
              resume_visible_to_hr       BOOLEAN NOT NULL DEFAULT FALSE,
              allow_hr_contact            BOOLEAN NOT NULL DEFAULT FALSE,
              allow_algorithm_optimization BOOLEAN NOT NULL DEFAULT TRUE,
              allow_research           BOOLEAN NOT NULL DEFAULT FALSE,
              data_retention_years     INT NOT NULL DEFAULT 3,
              created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY uk_privacy_user_id (user_id),
              CONSTRAINT fk_privacy_user_id
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            """;
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery(checkTableSql)) {
                if (rs.next() && rs.getInt(1) > 0) {
                    log.info("[DbMigration] privacy_settings table already exists, skip");
                    return;
                }
            }
            st.executeUpdate(createTableSql);
            log.info("[DbMigration] Created table privacy_settings");
        } catch (Exception e) {
            log.warn("[DbMigration] Migration for privacy_settings skipped or failed: {}", e.getMessage());
        }
    }
    
    private void migrateDataAccessLogs() {
        String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_access_logs'";
        String createTableSql = """
            CREATE TABLE data_access_logs (
              id                          BIGINT NOT NULL AUTO_INCREMENT,
              user_id                     BIGINT NOT NULL,
              access_type                VARCHAR(50) NOT NULL,
              accessor_info              TEXT NULL,
              accessed_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_access_user_id (user_id),
              KEY idx_accessed_at (accessed_at),
              CONSTRAINT fk_access_user_id
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            """;
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery(checkTableSql)) {
                if (rs.next() && rs.getInt(1) > 0) {
                    log.info("[DbMigration] data_access_logs table already exists, skip");
                    return;
                }
            }
            st.executeUpdate(createTableSql);
            log.info("[DbMigration] Created table data_access_logs");
        } catch (Exception e) {
            log.warn("[DbMigration] Migration for data_access_logs skipped or failed: {}", e.getMessage());
        }
    }
}
