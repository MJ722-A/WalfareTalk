/*
   복지톡 - 스프링부트 백엔드 중계 API 연동
  	역할: 화면(HTML/JS)에서 필요한 데이터를 백엔드 서버(Java)에 요청하고 받아오는 통신 전담 파일
*/

// 백엔드 서버의 기본 주소
// 나중에 실제 서버(AWS 등)에 배포할 때는 이 주소만 실제 도메인으로 바꿔주면 됨
const API_BASE = 'http://localhost:8080/api/welfare';

/**
 * 1. 복지 혜택 검색 함수
 * 키워드를 받아 백엔드에 공공데이터(복지 정보)를 요청하고, XML을 자바스크립트 객체로 변환
 */
async function searchWelfareServices(keyword, numOfRows = 3) {
    // 1-1. 백엔드에 보낼 질문지(파라미터)를 만듦
    const params = new URLSearchParams({
        keyword:   keyword,
        pageNo:    1,
        numOfRows: numOfRows
    });

    const targetUrl = `${API_BASE}?${params}`;

    try {
        // 1-2. fetch()를 이용해 백엔드 서버에 데이터를 달라고 요청
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`서버 응답 실패: ${res.status}`);
        
        // 1-3. 공공데이터포털(또는 백엔드)이 데이터를 옛날 방식인 XML로 주기 때문에 일단 텍스트로 받음
        const xmlText = await res.text();

        // 1-4. 텍스트 형태의 XML을 자바스크립트가 읽을 수 있는 문서 구조(DOM)로 변환
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        // 1-5. 변환된 문서에서 <servList> (복지 혜택 아이템) 태그들만 전부 긁어옴
        const itemNodes = xmlDoc.getElementsByTagName("servList");
        const items = [];

        // 1-6. 긁어온 XML 태그들을 쓰기 편한 자바스크립트 객체(JSON) 형태로 하나씩 포장
        for (let i = 0; i < itemNodes.length; i++) {
            const node = itemNodes[i];
            items.push({
                servId:    node.getElementsByTagName("servId")[0]?.textContent ?? '', // 고유 ID
                servNm:    node.getElementsByTagName("servNm")[0]?.textContent ?? '', // 복지 이름
                servDgst:  node.getElementsByTagName("servDgst")[0]?.textContent ?? '', // 한줄 요약
                jurMnofNm: node.getElementsByTagName("jurMnofNm")[0]?.textContent ?? '', // 담당 부처 (예: 보건복지부)
                srvUrl:    node.getElementsByTagName("servDtlLink")[0]?.textContent ?? '' // 상세 링크
            });
        }

        return items; // 포장된 배열을 돌려줌

    } catch (e) {
        console.error('API 오류:', e);
        return null;
    }
}

/**
 * 2. 일반 AI 채팅 함수
 * 사용자의 일상적인 질문이나 용어 설명을 백엔드(Gemini API)에 물어보고 답변을 받아옴
 */
async function askGeminiAI(message) {
    try {
        // 2-1. encodeURIComponent: 한글이나 특수문자가 URL에서 깨지지 않게 안전하게 암호화
        const response = await fetch(`http://localhost:8080/api/chat?message=${encodeURIComponent(message)}`);
        
        if (!response.ok) throw new Error("AI 서버 응답 에러");
        
        const data = await response.json();
        
        // 2-2. 제미나이가 주는 응답 중 진짜 텍스트 답변만 꺼내는 과정 
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "AI가 답변을 생성하지 못했어요. 다시 질문해 주세요!";
        }
    } catch (error) {
        console.error("AI 호출 중 에러:", error);
        return "현재 구글을 사용하는 사용자가 너무 많습니다. 잠시후 다시 질문해 주세요! 🥲";
    }
}

/**
 * 3. 문장 의도 분석 함수
 * 사용자의 말이 '일반 대화'인지, '복지 키워드 검색'인지 AI가 스스로 판단
 */
async function analyzeMessage(message) {
    try {
        const response = await fetch(`http://localhost:8080/api/analyze?message=${encodeURIComponent(message)}`);
        if (!response.ok) throw new Error("분석 서버 에러");
        
        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;
        
        // 3-1. 방어 코드: AI가 답변을 줄 때 가끔 ```json 이라는 마크다운 장식을 달고 올 때가 있음
        // 이러면 JSON 변환 시 에러가 나기 때문에 순수 텍스트만 남깁니다 (.replace).
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 3-2. 순수 텍스트(문자열)를 진짜 자바스크립트 객체({ type: "SEARCH", keyword: "청년" })로 변환
        return JSON.parse(aiText);
        
    } catch (error) {
        console.error("문장 분석 중 에러:", error);
        // 에러가 나더라도 프로그램이 멈추지 않고, 일단 일반 질문으로 넘기도록 하는 안전장치(Fallback)
        return { type: "CHAT", keyword: "" };
    }
}

// 전역 창고 준비: 나중에 '찜하기' 버튼을 눌렀을 때 데이터를 꺼내 쓸 수 있도록 
// 혜택 상세 정보를 모아두는 브라우저 내의 창고
window.welfareDataStore = window.welfareDataStore || {};

/**
 * 4. 화면 출력 포맷팅 함수
 * 찾아온 복지 데이터를 채팅창에 말풍선으로 띄울 수 있도록 HTML 태그로 조립
 */
function formatWelfareResponse(items, keyword) {
    let resultHtml = `"${keyword}" 으/로 검색된 복지 혜택 ${items.length}건을 찾았습니다!\n\n`;

    items.forEach((item, index) => {
        // 4-1. 만약 고유 ID가 없다면 임시 번호를 만들어서라도 에러 방지
        const itemId = item.servId || `welfare-${Date.now()}-${index}`;
        
        // 4-2. 화면에 글씨만 띄우는 게 아니라 전체 데이터를 창고(welfareDataStore)에 넣어둠
		// 나중에 🤍를 누르면 여기서 꺼내서 DB로 보냄
        window.welfareDataStore[itemId] = item; 

        // 4-3. 브라우저 저장소를 확인해서 지금 띄우는 혜택이 이미 내가 찜한 건지 검사하고 하트 색깔을 정함
        const favorites = JSON.parse(localStorage.getItem('welfareFavorites')) || [];
        const isFav = favorites.some(f => f.id === itemId);
        const heartIcon = isFav ? '♥️' : '🤍';

        // 4-4. 복지로 공공데이터 API 같은 외부 API 연동 시 잘못된 값이 넘어오는 경우가 많음
        // 그럴 경우 고유 ID(servId)를 이용해 '무조건 작동하는 상세 페이지 주소'를 직접 조립해 주는 방어 코드
        let link = `[https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=$](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=$){item.servId}`;
        
        if (!item.servId) {
            link = item.servDtlLink || '[https://www.bokjiro.go.kr](https://www.bokjiro.go.kr)';
        }

        // 4-5. 최종적으로 화면에 그려질 HTML 코드들을 연결
        resultHtml += `━━━━━━━━━━━━━━\n`;
        // onclick 이벤트에 아이디를 심어둬서, 클릭 시 toggleFavorite 함수가 '누구'를 눌렀는지 알게 함
        resultHtml += `📋 ${index + 1}. ${item.servNm} <span id="heart-${itemId}" style="cursor:pointer; font-size:18px;" onclick="toggleFavorite('${itemId}')">${heartIcon}</span>\n`;
        resultHtml += `🏛️ ${item.jurMnofNm || '부처지정안됨'}\n\n`;
        resultHtml += `${item.servDgst || '상세 내용이 없습니다.'}\n\n`;
        resultHtml += `🔗 신청하기: ${link}\n\n`;
    });

    resultHtml += `더 궁금한 점이 있으면 질문해 주세요! 😊`;
    return resultHtml;
}