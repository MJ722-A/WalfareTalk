package com.example.demo.controller;

import com.example.demo.entity.Favorite;
import com.example.demo.service.FavoriteService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@CrossOrigin(origins = "*") 
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    // 💡 수정된 부분: @PathVariable 뒤에 ("userId")를 명시적으로 적어주었습니다!
    @PostMapping("/{userId}")
    public Favorite addFavorite(@PathVariable("userId") Long userId, @RequestBody Favorite favorite) {
        return favoriteService.saveFavorite(userId, favorite);
    }

    // 💡 수정된 부분: 여기도 마찬가지로 ("userId")를 적어주었습니다!
    @GetMapping("/{userId}")
    public List<Favorite> getUserFavorites(@PathVariable("userId") Long userId) {
        return favoriteService.getFavorites(userId);
    }
    
 // 💡 추가: [DELETE] 삭제 요청이 들어오면 실행됨
    @DeleteMapping("/{userId}/{servId}")
    public void removeFavorite(@PathVariable("userId") Long userId, @PathVariable("servId") String servId) {
        favoriteService.removeFavorite(userId, servId);
    }
}