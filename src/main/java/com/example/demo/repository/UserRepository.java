package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// JpaRepository<엔티티 이름, Primary Key의 타입>
public interface UserRepository extends JpaRepository<User, Long> {
    
    // 이메일을 줄 테니, 해당하는 유저 정보를 찾아오기
    // 로그인할 때 아이디(이메일)가 맞는지 확인할 때 쓰임
    Optional<User> findByEmail(String email);
    
}