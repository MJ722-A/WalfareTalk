package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.service.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*") // 프론트엔드 접근 허용
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 💡 [POST] /api/users/signup 주소로 데이터가 오면 DB에 저장!
    @PostMapping("/signup")
    public User registerUser(@RequestBody User user) {
        return userService.saveUser(user);
    }
    
 // 💡 추가된 코드: 로그인 창구
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User loginInfo) {
        User user = userService.login(loginInfo.getEmail(), loginInfo.getPassword());
        
        if (user != null) {
            // 로그인 성공! 진짜 유저 정보를 프론트엔드로 보내줍니다.
            return ResponseEntity.ok(user); 
        } else {
            // 로그인 실패! 에러 상태(401)를 보냅니다.
            return ResponseEntity.status(401).body("이메일 또는 비밀번호가 틀렸습니다.");
        }
    }
}