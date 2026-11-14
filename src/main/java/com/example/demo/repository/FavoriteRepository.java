package com.example.demo.repository;

import com.example.demo.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    // 유저 번호(userId)를 줄 테니 그 사람이 찜한 혜택을 가져오기
    // 하단 리스트나 캘린더에 찜한 목록을 띄워줄 때 쓰임
    List<Favorite> findByUserId(Long userId);
    
    // 유저 번호와 서비스 ID를 줄테니 데이터베이스 창고에서 삭제 
    @Transactional
    void deleteByUserIdAndServId(Long userId, String servId);
    
}