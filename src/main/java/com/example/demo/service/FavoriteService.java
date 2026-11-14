package com.example.demo.service;

import com.example.demo.entity.Favorite;
import com.example.demo.entity.User;
import com.example.demo.repository.FavoriteRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FavoriteService {
    
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    // 일꾼(Repository)들을 고용(주입)
    public FavoriteService(FavoriteRepository favoriteRepository, UserRepository userRepository) {
        this.favoriteRepository = favoriteRepository;
        this.userRepository = userRepository;
    }

    // 프론트에서 찜하기 정보가 오면 DB에 저장하는 함수
    public Favorite saveFavorite(Long userId, Favorite favorite) {
        // 1. 유저 번호로 DB에서 진짜 유저 정보 찾기
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        
        // 2. 찜하기 데이터에 "이건 이 유저의 찜목록이야!" 라고 이름표 붙여주기
        favorite.setUser(user);
        
        // 3. DB에 최종 저장!
        return favoriteRepository.save(favorite);
    }

    // 유저 번호를 받아서 그 사람이 찜한 목록을 전부 가져오는 함수
    public List<Favorite> getFavorites(Long userId) {
        return favoriteRepository.findByUserId(userId);
    }
    
 // 추가: 창고에서 데이터를 삭제하는 서비스
    public void removeFavorite(Long userId, String servId) {
        favoriteRepository.deleteByUserIdAndServId(userId, servId);
    }
}