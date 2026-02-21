package www.gradquest.com;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * @author guyuanyuan
 */
@SpringBootApplication
@MapperScan("www.gradquest.com.mapper")
public class GradQuestApplication {

    public static void main(String[] args) {
        SpringApplication.run(GradQuestApplication.class, args);
    }
}
