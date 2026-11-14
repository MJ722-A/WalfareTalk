package com.example.demo.service;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 💡 프론트에서 넘어온 유저 정보를 DB에 저장하는 함수
    public User saveUser(User user) {
        return userRepository.save(user);
    }
    
 // 💡 추가된 코드: 로그인 검사 함수
    public User login(String email, String password) {
        // 1. 이메일로 유저를 찾습니다.
        return userRepository.findByEmail(email)
                // 2. 찾은 유저의 비밀번호가 입력한 비밀번호와 똑같은지 확인합니다.
                .filter(user -> user.getPassword().equals(password))
                // 3. 못 찾거나 비밀번호가 틀리면 null(없음)을 반환합니다.
                .orElse(null); 
    }
}