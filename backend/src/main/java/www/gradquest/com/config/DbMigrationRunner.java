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
            log.warn("[DbMigration] Migration skipped or failed: {}", e.getMessage());
        }
    }
}
