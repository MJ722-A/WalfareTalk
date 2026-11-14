package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@CrossOrigin(origins = "*") 
public class WelfareController {

    @Value("${welfare.api.key}")
    private String apiKey;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @GetMapping(value = "/api/welfare", produces = "application/xml;charset=UTF-8")
    public String getWelfareList(
            @RequestParam(value = "keyword", required = false, defaultValue = "") String keyword,
            @RequestParam(value = "pageNo", defaultValue = "1") int pageNo,
            @RequestParam(value = "numOfRows", defaultValue = "10") int numOfRows) {
        
        try {
            String baseUrl = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001";
            
            StringBuilder urlBuilder = new StringBuilder(baseUrl);
            urlBuilder.append("?serviceKey=").append(apiKey);
            urlBuilder.append("&callTp=L");
            urlBuilder.append("&pageNo=").append(pageNo);
            urlBuilder.append("&numOfRows=").append(numOfRows);
            urlBuilder.append("&srchKeyCode=001");
            
            if (!keyword.isEmpty()) {
                urlBuilder.append("&searchWrd=").append(URLEncoder.encode(keyword, StandardCharsets.UTF_8));
            }

            URI uri = new URI(urlBuilder.toString());
            RestTemplate restTemplate = new RestTemplate();
            
            ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
            return response.getBody();
            
        } catch (Exception e) {
            return "<error>API 호출 중 오류: " + e.getMessage() + "</error>";
        }
    }

    @GetMapping(value = "/api/chat", produces = "application/json;charset=UTF-8")
    public String chatWithAI(@RequestParam(value = "message") String message) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            ObjectMapper mapper = new ObjectMapper();
            ObjectNode textNode = mapper.createObjectNode();
            textNode.put("text", "너는 친절하고 전문적인 '복지톡' AI 상담사야. 사용자가 묻는 어려운 복지 용어나 정책을 일반인이 이해하기 쉽게 다정하게 3줄 이내로 요약해서 설명해줘. 사용자 질문: " + message);

            ArrayNode partsNode = mapper.createArrayNode();
            partsNode.add(textNode);
            ObjectNode contentsNode = mapper.createObjectNode();
            contentsNode.set("parts", partsNode);
            ArrayNode contentsArray = mapper.createArrayNode();
            contentsArray.add(contentsNode);
            ObjectNode requestBodyNode = mapper.createObjectNode();
            requestBodyNode.set("contents", contentsArray);

            String requestBody = mapper.writeValueAsString(requestBodyNode);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            return response.getBody();
            
        } catch (Exception e) {
            e.printStackTrace(); 
            
            // 💡 기본 에러 메시지
            String errorMessage = "앗, AI 서버와 통신 중 알 수 없는 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
            
            // 구글 서버 과부하(503) 에러
            if (e.getMessage() != null && e.getMessage().contains("503")) {
                errorMessage = "🚨 [안내] 현재 구글 AI(Gemini) 서버에 전 세계적인 접속 폭주로 인해 일시적인 과부하가 발생했습니다. (구글 서버 자체 문제입니다) 1~2분 뒤에 다시 시도해 주세요!";
            } else if (e.getMessage() != null && e.getMessage().contains("429")) {
                // 혹시라도 너무 많이 질문해서 할당량을 초과했을 때의 방어막
                errorMessage = "🚨 [안내] 구글 AI 서버 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요!";
            }
            
            // 프론트엔드가 뻗지 않도록, AI가 정상적으로 대답한 것처럼 포장해서 에러 메시지를 보냅니다.
            return "{\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"" + errorMessage + "\"}]}}]}";
        }
    }
    
// 사용자 의도를 파악해서 답변하도록 설정 
    @GetMapping(value = "/api/analyze", produces = "application/json;charset=UTF-8")
    public String analyzeIntent(@RequestParam(value = "message") String message) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            ObjectMapper mapper = new ObjectMapper();
            ObjectNode textNode = mapper.createObjectNode();
            
         // 검색 키워드를 '가장 짧은 핵심 명사'로 좁히도록 유도
            String prompt = "다음 사용자의 메시지를 분석해서, 복지 혜택을 찾는 '검색' 의도인지 단순한 '질문'인지 분류해줘. "
                          + "반드시 아래 JSON 형식으로만 대답하고 다른 말은 절대 하지마. 마크다운(```)도 쓰지마.\n"
                          + "1. 복지 검색인 경우: {\"type\": \"SEARCH\", \"keyword\": \"공공데이터 검색에 적합한 가장 짧은 핵심 명사 1개(예: 월세, 교통, 청년, 임산부)\"}\n"
                          + "2. 단순 질문인 경우: {\"type\": \"CHAT\", \"keyword\": \"\"}\n"
                          + "사용자 메시지: " + message;
                          
            textNode.put("text", prompt);

            ArrayNode partsNode = mapper.createArrayNode();
            partsNode.add(textNode);
            ObjectNode contentsNode = mapper.createObjectNode();
            contentsNode.set("parts", partsNode);
            ArrayNode contentsArray = mapper.createArrayNode();
            contentsArray.add(contentsNode);
            ObjectNode requestBodyNode = mapper.createObjectNode();
            requestBodyNode.set("contents", contentsArray);

            String requestBody = mapper.writeValueAsString(requestBodyNode);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            return response.getBody();
            
        } catch (Exception e) {
            e.printStackTrace();
            // 에러 시 기본값으로 CHAT(일반 대화) 처리하도록 안전망 구축
            return "{\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"{\\\"type\\\": \\\"CHAT\\\", \\\"keyword\\\": \\\"\\\"}\"}]}}]}";
        }
    }
}