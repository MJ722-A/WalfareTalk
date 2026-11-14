package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// 데이터베이스(DataSource)와 JPA(Hibernate) 자동 설정을 모두 완전히 끔
@SpringBootApplication(excludeName = {
    "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
    "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
public class WelfareTalkApplication {

    public static void main(String[] args) {
        SpringApplication.run(WelfareTalkApplication.class, args);
    }
}