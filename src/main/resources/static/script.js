/* ========================================================
   [복지톡 - 프론트엔드 핵심 로직]
   화면 이동, 데이터 출력, 서버 통신(API), 이벤트 감지 등
   웹페이지의 모든 동작을 제어하는 메인 자바스크립트 파일
   ========================================================
*/

// 캘린더에 표시될 일정들을 임시로 담아두는 빈 배열 
// 나중에 DB에서 가져온 찜 목록이 채워짐
const CALENDAR_EVENTS = {};

// 프로필 화면의 관심 분야 등을 표시할 때 사용하는 카테고리 목록
const CATEGORIES = ["전체", "생계지원", "주거지원", "의료지원", "교육지원", "고용지원", "문화지원", "기타"];

// 캘린더 화면에서 현재 보고 있는 연도와 월을 기억하는 변수(기본값: 2026년 6월)
let currentYear = 2026;
let currentMonth = 6;

// [초기화 로직] 웹페이지의 HTML 뼈대가 모두 로딩되면 제일 먼저 딱 한 번 실행되는 세팅 구간
document.addEventListener('DOMContentLoaded', () => {
    // 1. 화면 곳곳에 있는 Lucide 아이콘(하트, 돋보기 등)을 그림
    lucide.createIcons();
    
    // 2. 로그인 상태라면, 브라우저 저장소에서 이름을 가져와 화면에 띄움
    updateUserInfo();
	
    // 3. 화면의 각 구역(캘린더, 프로필 관심사, 가이드)에 기본 데이터를 채워 넣음
    renderCalendar();
    renderProfileInterests();
    renderGuideContent('document');
    
    // 4. 버튼 클릭, 키보드 입력 등을 감지하는 리스너들을 작동시킴
    setupEventListeners();
	
    // 5. 사용자가 찜한 복지 목록을 화면 하단에 표시
    renderFavoriteBenefits();
	
    // 6. 메인 홈 화면의 검색창에서 '엔터(Enter)' 키를 누르면 채팅창으로 바로 넘어가도록 설정
    const homeInput = document.getElementById('home-search-input');
    if (homeInput) {
        homeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startChatFromHome();
        });
    }
});

// [달력 그리기] currentYear와 currentMonth를 기준으로 달력의 날짜 칸을 생성
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const displayMonth = document.getElementById('display-month');
    if (!grid || !displayMonth) return;

    // 달력 상단에 위에서 정한 기본값에 따라 '2026년 6월' 글자를 갱신
    displayMonth.innerText = `${currentYear}년 ${currentMonth}월`;

    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    let html = '';

    // 요일 헤더를 그림
    daysOfWeek.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // 해당 월의 1일이 시작하기 전까지의 빈 공간을 계산해서 투명한 칸으로 채움
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    // 오늘 날짜에 색상을 다르게 표시하기 위해 오늘이 며칠인지 확인함
    const today = new Date();
    const isTodayYear = today.getFullYear() === currentYear;
    const isTodayMonth = today.getMonth() + 1 === currentMonth;
    const todayDate = today.getDate();

    // 1일부터 말일까지 실제 날짜 칸을 그림
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = isTodayYear && isTodayMonth && i === todayDate;
        
        // 날짜를 'YYYY-MM-DD' 형태로 만들어 CALENDAR_EVENTS 창고에 일정이 있는지 확인
        const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const eventData = CALENDAR_EVENTS[dateKey];
        const hasEvent = !!eventData;

        // 일정이 있으면 점(dot)을 찍어주고, 클릭 시 showEventPopup 함수가 실행
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" 
                 onclick="${hasEvent ? `showEventPopup('${dateKey}')` : ''}">
                ${i}
                ${hasEvent ? '<div class="day-event-dot"></div>' : ''}
            </div>
        `;
    }

    grid.innerHTML = html;
}

// [달력 팝업 띄우기] 달력에서 일정이 있는 날짜를 클릭했을 때 상세 정보를 보여주는 모달 창
// 💡 [수정됨] 달력 팝업 띄우기 (날짜 없는 데이터 호환)
function showEventPopup(dateKey) {
    const event = CALENDAR_EVENTS[dateKey];
    if (!event) return;

    const modal = document.getElementById('calendar-modal');
    const modalTitle = document.getElementById('modal-date-title');
    const modalBody = document.getElementById('modal-event-body');

    // 💡 1. 날짜가 있는 혜택(YYYY-MM-DD)인지, 없는 혜택(no-date-...)인지 구분하여 제목 설정
    if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateKey.split('-');
        modalTitle.innerText = `${parseInt(month)}월 ${parseInt(day)}일 복지 소식`;
    } else {
        modalTitle.innerText = `복지 혜택 상세 안내`;
    }
    
    // 💡 2. 신청 기간 표시 로직 (시작, 종료일이 모두 '-' 이면 '-' 하나만 표시)
    let periodText = `${event.startDate} ~ ${event.endDate}`;
    if (event.startDate === '-' && event.endDate === '-') {
        periodText = '-';
    } else if (event.endDate === '상세페이지 확인' || event.endDate === '-') {
        periodText = `${event.startDate} ~ 상세확인`;
    }

    modalBody.innerHTML = `
        <div class="event-detail">
            <div class="event-info-item">
                <span class="event-info-label">제목</span>
                <div class="event-info-value highlight">${event.title}</div>
            </div>
            <div class="event-info-item">
                <span class="event-info-label">소개</span>
                <div class="event-info-value">${event.description}</div>
            </div>
            <div class="event-info-item">
                <span class="event-info-label">신청 기간</span>
                <div class="event-info-value">${periodText}</div>
            </div>
            <div class="event-info-item">
                <span class="event-info-label">신청하기</span>
                <div class="event-info-value">
                    <a href="${event.link || 'https://www.bokjiro.go.kr'}" target="_blank" style="color: #0066cc; text-decoration: underline; font-weight: bold; word-break: break-all;">
                        🔗 신청 가능한 링크로 이동하기
                    </a>
                </div>
            </div>
            <div class="event-footer">
                <button class="event-action-btn" onclick="closeCalendarModal()">닫기</button>
                <button class="event-action-btn primary" onclick="switchSection('chat'); closeCalendarModal()">상담하기</button>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// 모달 창을 다시 숨기는 함수입니다.
function closeCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// [가이드 화면 그리기] 준비서류 가이드 화면에서 '필수 서류'와 '용어 사전' 탭의 내용을 바꿔줌
function renderGuideContent(type) {
    const container = document.getElementById('guide-content');
    if (!container) return;

    container.style.background = 'transparent';
    container.style.boxShadow = 'none';
    container.style.padding = '0';
    container.style.border = 'none'; 

    if (type === 'document') {
        container.innerHTML = `
            <div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
                <h4 class="guide-subtitle" style="margin-top: 0;color:#5A5A40;">공통 필수 서류</h4>
                <ul class="guide-list">
                    <li>신분증 (주민등록증, 운전면허증 등)</li>
                    <li>가족관계증명서 (상세)</li>
                    <li>주민등록등본</li>
                </ul>
            </div>

            <div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
                <h4 class="guide-subtitle" style="margin-top: 0;color:#5A5A40;">소득 및 재산 증빙 서류</h4>
                <ul class="guide-list">
                    <li>건강보험료 납부확인서 및 자격득실확인서</li>
                    <li>소득금액증명원 또는 근로소득 원천징수영수증</li>
                    <li>통장 거래내역서 (최근 3~6개월)</li>
                </ul>
            </div>

            <div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
                <h4 class="guide-subtitle" style="margin-top: 0;color:#5A5A40;">주거 지원 관련 서류</h4>
                <ul class="guide-list">
                    <li>임대차계약서 사본 (확정일자 포함)</li>
                    <li>최근 월세 이체 내역증 (은행 송금증 등)</li>
                    <li>가족관계증명서 (부모님과 분리 거주 시)</li>
                </ul>
            </div>
        `;
    } else {
        container.innerHTML = `
			<div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
				<h4 class="guide-subtitle" style="margin-top: 0; color:#5A5A40;">소득 인정액</h4>
			    <ul class="guide-list">
			    	<li>소득평가액과 재산의 소득 합산액을 합산한 금액</li>
			        <li>월급뿐만 아니라 자동차, 집, 예금 같은 내 재산까지 전부 돈으로 환산해서 더한 '내 진짜 재산 점수'를 의미하며 정부는 이 점수로 지원 대상인지 판단합니다.</li>
			    </ul>
			</div>
			
			<div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
				<h4 class="guide-subtitle" style="margin-top: 0; color:#5A5A40;">차상위계층</h4>
			    <ul class="guide-list">
			    	<li>기초생활보장 수급권자에 해당하지 아니하는 계층으로서 소득인정액이 기준 중위소득의 100분의 50 이하인 사람</li>
			        <li>기초생활수급자는 아니지만, 그 바로 위 단계로 형편이 넉넉하지 않아 정부의 지원이 필요한 분들을 말합니다.</li>
			    </ul>
			</div>
			
			<div class="guide-item" style="background: #ffffff; padding: 20px 25px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; border: none;">
				<h4 class="guide-subtitle" style="margin-top: 0; color:#5A5A40;">무주택세대 구성원</h4>
			    <ul class="guide-list">
			    	<li>세대에 속한 자 전원이 주택을 소유하고 있지 아니한 세대의 구성원</li>
			        <li>나 혼자만이 아니라, 주민등록등본에 같이 이름이 올라가 있는 가족 전부가 본인 명의의 집이 없는 상태를 말합니다.</li>
			    </ul>
			</div>
			
        `;
    }
}

// [프로필 관심사 그리기] 사용자가 선택한 관심 분야를 둥근 칩 형태로 표시
function renderProfileInterests() {
    const container = document.getElementById('profile-interests');
    if (!container) return;

    const userInterests = ["주거지원", "고용지원"];
    container.innerHTML = CATEGORIES.slice(1).map(cat => `
        <div class="chip ${userInterests.includes(cat) ? 'active' : ''}" onclick="this.classList.toggle('active')">
            ${cat}
        </div>
    `).join('');
}

// [화면 전환(SPA)] 하단 탭을 눌렀을 때 페이지 새로고침 없이 화면(.view-section)만 부드럽게 교체
function switchSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0); // 새 화면으로 가면 맨 위로 스크롤을 올림
    }
    
    updateNavUI(sectionId);
}

// 하단 네비게이션 아이콘의 색상을 바꾸고 활성화 점(dot)을 옮겨주는 UI 업데이트 함수
function updateNavUI(activeId) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const onclickAttr = item.getAttribute('onclick');
        if (!onclickAttr) return;
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match) return;
        const itemId = match[1];
        const isActive = itemId === activeId;
        
        item.classList.toggle('active', isActive);
        
        // 활성화된 메뉴 아래에 작은 점(dot)을 추가하거나 제거
        let dot = item.querySelector('.active-dot');
        if (isActive) {
            if (!dot) {
                dot = document.createElement('div');
                dot.className = 'active-dot';
                item.appendChild(dot);
            }
        } else {
            if (dot) dot.remove();
        }
    });
}

// [이벤트 리스너 모음] 사용자의 클릭이나 키보드 입력을 기다렸다가 특정 동작을 실행하게 만듦
function setupEventListeners() {
    // 1. 하이퍼링크 등 네비게이션 클릭 감지
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(link.dataset.target);
        });
    });

    // 2. 가이드 화면의 탭 버튼 클릭 감지
    document.querySelectorAll('.guide-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderGuideContent(tab.dataset.guide);
        });
    });

    // 3. 캘린더 월 이동 버튼(이전/다음 달) 클릭 감지
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 1) { currentMonth = 12; currentYear--; }
            renderCalendar();
        });
        
        nextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 12) { currentMonth = 1; currentYear++; }
            renderCalendar();
        });
    }

    // 4. [AI 채팅 전송 핵심 로직] 채팅창 입력 감지
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.querySelector('.send-button');
    if (chatInput && sendButton) {
		const sendMessage = async () => {
		    const text = chatInput.value.trim();
		    if (!text) return;

		    // 사용자가 입력한 메시지를 화면에 말풍선으로 띄움
		    appendMessage('user', text);
		    chatInput.value = '';

		    // 서버 통신 중 대기 상태를 나타내는 로딩(...) 애니메이션을 띄움
		    const loadingId = appendLoadingMessage();

		    try {
		        // AI 의도 분석기(api.js)를 통해 검색인지 일반 대화인지 판단
		        const analysisResult = await analyzeMessage(text);
		        console.log("AI 분석 결과:", analysisResult); 

		        if (analysisResult.type === "CHAT") {
		            // [경로 A] 일상 대화 또는 용어 질문일 때 -> 제미나이가 바로 답변
		            const aiReply = await askGeminiAI(text);
		            removeLoadingMessage(loadingId);
		            appendMessage('ai', aiReply);
		            
		        } else if (analysisResult.type === "SEARCH") {
		            // [경로 B] 정책 검색일 때 -> 뽑아낸 키워드로 백엔드/공공데이터 호출
		            const searchKeyword = analysisResult.keyword;
		            const items = await searchWelfareServices(searchKeyword);
		            
		            removeLoadingMessage(loadingId);
		            
		            if (items.length === 0) {
		                appendMessage('ai', `"${searchKeyword}" 키워드로 복지 혜택을 찾아보았지만, 해당하는 정책을 찾지 못했어요.\n\n아래 키워드로 다시 질문해 보시겠어요?\n• 청년 주거\n• 실업급여\n• 장애인 지원`);
		            } else {
		                // 가져온 데이터를 보기 좋게 포장해서 채팅창에 띄움
		                const responseText = formatWelfareResponse(items, searchKeyword);
		                appendMessage('ai', responseText);
		            }
		        }
		    } catch (error) {
		        removeLoadingMessage(loadingId);
		        appendMessage('ai', '다시 한 번 말씀해 주시겠어요? 🥲');
		    }
		};

        // 전송 버튼을 누르거나 키보드 엔터키를 쳤을 때 sendMessage 함수를 실행
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

// [채팅 말풍선 생성] 누가(sender) 보낸 어떤 내용(text)인지 받아서 채팅창 화면 맨 아래에 추가
function appendMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    
    // 텍스트 속 URL(http)을 찾아내어 실제 클릭 가능한 하이퍼링크 <a> 태그로 자동 변환
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formattedText = text.replace(urlRegex, function(url) {
		return `<a href="${url}" target="_blank" style="color: #0066cc; text-decoration: underline; font-weight: bold; word-break: break-all;">${url}</a>`;
    });
    
    // 키보드 줄바꿈(\n)을 HTML 줄바꿈(<br>)으로 바꿔줍니다.
    formattedText = formattedText.replace(/\n/g, '<br>');

    msgDiv.innerHTML = formattedText;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // 항상 스크롤을 맨 아래로 내려줌
}

// [로그인 처리] 이메일과 비밀번호를 백엔드 서버(Spring Boot)로 보내서 회원 검증을 받음
window.login = async function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("이메일과 비밀번호를 입력해주세요.");
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        if (response.ok) {
            const user = await response.json(); 
            
            // 로그인 성공 시 서버가 준 진짜 유저 번호(PK)를 저장
            CURRENT_USER_ID = user.id;
            
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userEmail', user.email);

            document.getElementById('login-page').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';

            updateUserInfo();
            loadFavoritesFromDB(); // 해당 유저의 찜 목록을 DB에서 가져옴

        } else {
            alert("이메일 또는 비밀번호가 틀렸습니다.");
        }
    } catch (error) {
        console.error("로그인 에러:", error);
        alert("서버와 연결할 수 없습니다.");
    }
};

// [로그아웃 처리] 브라우저에 저장된 내 정보를 비우고 모든 화면을 초기화
window.logout = function() {
    CURRENT_USER_ID = null;
    localStorage.removeItem('userId');
    localStorage.removeItem('welfareFavorites');

    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';

    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    const favoriteList = document.getElementById('favorite-list');
    if(favoriteList) favoriteList.innerHTML = '';
    for (let key in CALENDAR_EVENTS) { delete CALENDAR_EVENTS[key]; }

    const chatMessages = document.getElementById('chat-messages');
    if(chatMessages) {
        chatMessages.innerHTML = `<div class="message ai-message">안녕하세요! 복지 혜택을 찾아드릴게요. 궁금하신 점이 있나요?</div>`;
    }
};
	
// [유저 정보 갱신] 브라우저 저장소에 있는 유저 이름과 이메일을 홈 화면과 프로필 화면 텍스트에 적용 
window.updateUserInfo = function() {
    const username = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    const greeting = document.getElementById('user-greeting');
    if (greeting && username) greeting.innerText = `${username}님, 복지톡이 곁에 있어요!`;

    const profileName = document.getElementById('profile-name');
    if (profileName && username) profileName.innerText = username;

    const profileEmail = document.getElementById('profile-email');
    if (profileEmail && email) profileEmail.innerText = email;
};

// [프로필 수정 화면 열기] 기존 정보를 입력칸에 채워 넣은 채로 수정 화면으로 넘어감
function openEditProfile() {
    const username = localStorage.getItem('userName') || '';
    const email = localStorage.getItem('userEmail') || '';

    document.getElementById('edit-name').value = username;
    document.getElementById('edit-email').value = email;

    switchSection('edit-profile');
}

// [프로필 저장] (현재는 브라우저 저장소에만 저장하며, 나중에 DB 연동 코드로 확장 가능합니다.)
function saveProfile() {
    const newName = document.getElementById('edit-name').value;
    const newEmail = document.getElementById('edit-email').value;
    const newLocation = document.getElementById('edit-location').value;

    localStorage.setItem('userName', newName);
    localStorage.setItem('userEmail', newEmail);
    localStorage.setItem('userLocation', newLocation);

    updateUserInfo();
    alert('정보가 저장되었습니다.');
    switchSection('profile');
}

// [회원가입 화면 열기 및 데이터 초기화]
window.openSignup = function() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('signup-page').style.display = 'flex';

    // 화면이 열릴 때마다 이전 입력값들을 깔끔하게 지움
    const inputs = ['signup-name', 'signup-birth', 'signup-email', 'signup-password', 'signup-job'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    const loc = document.getElementById('signup-location');
    if (loc) loc.selectedIndex = 0;
};

// [로그인 화면으로 뒤로 가기]
function backToLogin() {
    document.getElementById('signup-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
}

// [회원가입 처리] 입력된 6가지 정보를 모아 백엔드(User 엔티티) 규격에 맞춰 서버로 전송
window.signup = async function() {
    const name = document.getElementById('signup-name').value;
    const birth = document.getElementById('signup-birth').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    //const location = document.getElementById('signup-location').value;
    //const job = document.getElementById('signup-job').value;

    if(!name || !birth || !email || !password){
        alert('모든 정보를 입력해주세요.');
        return;
    }

    const userData = {
        name: name, birth: birth, email: email,
        password: password
    };

    try {
        const response = await fetch('http://localhost:8080/api/users/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            alert('회원가입이 완료되었습니다!');
            document.getElementById('signup-page').style.display = 'none';
            document.getElementById('login-page').style.display = 'flex';
        } else {
            alert('회원가입에 실패했습니다. (이미 존재하는 이메일일 수 있습니다.)');
        }
    } catch (error) {
        alert("서버와 연결할 수 없습니다.");
    }
}

// [로딩 애니메이션 추가/제거] 통신 중일 때 나타나는 '● ● ●' 애니메이션
function appendLoadingMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const id = 'loading-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message loading-message';
    msgDiv.id = id;
    msgDiv.innerHTML = `<span class="dot">●</span><span class="dot">●</span><span class="dot">●</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeLoadingMessage(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

/* =========================================================
   하트(찜하기) & 취소 & 캘린더 동기화 핵심 로직
   =========================================================
*/

let CURRENT_USER_ID = localStorage.getItem('userId') || null;

// [찜하기/취소 토글] 혜택 옆의 하트를 눌렀을 때 DB와 통신하여 상태를 바꿈
window.toggleFavorite = async function(id) {
    const savedFavorites = JSON.parse(localStorage.getItem('welfareFavorites')) || [];
    const isAlreadyFavorited = savedFavorites.some(item => item.id === id);

    if (isAlreadyFavorited) {
        // 이미 찜한 거라면 DB에 삭제(DELETE) 요청
        try {
            const response = await fetch(`http://localhost:8080/api/favorites/${CURRENT_USER_ID}/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) loadFavoritesFromDB();
        } catch (error) { console.error("삭제 실패:", error); }
    } else {
        // 찜하지 않은 거라면 복지 원본 창고(welfareDataStore)에서 데이터를 꺼내 DB에 추가(POST) 요청
        const item = window.welfareDataStore[id];
        if (!item) return;

        const title = item.servNm || '복지 혜택';
        const desc = item.servDgst || '상세 내용 없음';
        let link = `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`;
        if (!item.servId) link = item.servDtlLink || 'https://www.bokjiro.go.kr';

        try {
            const response = await fetch(`http://localhost:8080/api/favorites/${CURRENT_USER_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ servId: id, title: title, description: desc, link: link })
            });

            if (response.ok) {
                alert(`'${title}' 혜택이 관심 목록에 등록되었습니다!`);
                loadFavoritesFromDB(); 
            }
        } catch (error) { console.error("추가 실패:", error); }
    }
};

// [하단 리스트에서 취소] 하단의 찜 목록 탭에서 'X 취소'를 눌렀을 때 캘린더 동기화를 맞춰주는 함수
window.removeFavorite = async function(id) {
    for (let dateKey in CALENDAR_EVENTS) {
        if (CALENDAR_EVENTS[dateKey].id === id) {
            delete CALENDAR_EVENTS[dateKey];
        }
    }
    await window.toggleFavorite(id);
};

// [찜 목록 화면 그리기 & 캘린더 일정 박아넣기]
// 💡 [수정됨] 찜 목록 화면 그리기 & 제목 클릭 시 팝업 띄우기 적용
window.renderFavoriteBenefits = function() {
    const container = document.getElementById('favorite-list');
    if (!container) return;

    let favorites = JSON.parse(localStorage.getItem('welfareFavorites')) || [];

    if (favorites.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:14px; padding: 20px; text-align: center;">아직 관심 등록한 혜택이 없습니다.<br>챗봇에서 🤍를 눌러보세요!</p>';
        return;
    }

    // 데이터가 겹치지 않게 캘린더 이벤트를 한 번 비워줍니다.
    for (let key in CALENDAR_EVENTS) delete CALENDAR_EVENTS[key];

    favorites.forEach(fav => {
        // 💡 1. 날짜가 아예 없는 경우를 대비해 캘린더에 안 뜨는 숨겨진 키('no-date-아이디')와 '-' 기본값 설정
        let eventDate = `no-date-${fav.id}`; 
        let displayDate = ""; 
        let startDateStr = "-";
        let endDateStr = "-";

        const dateRegex = /(?:['’]?(?:20)?\d{2}[년\.]\s*)?(\d{1,2})[월\.]\s*(\d{1,2})[일\.]?/g;
        const matches = [...fav.desc.matchAll(dateRegex)];

        if (matches.length > 0) {
            const startMonth = matches[0][1].padStart(2, '0');
            const startDay = matches[0][2].padStart(2, '0');
            eventDate = `${currentYear}-${startMonth}-${startDay}`;
            startDateStr = eventDate;
            
            const startStr = `${matches[0][1]}.${matches[0][2]}`;
            let endStr = "상세확인";

            if (matches.length > 1) {
                const endMonth = matches[1][1].padStart(2, '0');
                const endDay = matches[1][2].padStart(2, '0');
                endDateStr = `${currentYear}-${endMonth}-${endDay}`;
                endStr = `${matches[1][1]}.${matches[1][2]}`;
            }
            displayDate = ` <span style="font-size: 13px; color: #ff4b4b; font-weight: normal;">(${startStr} ~ ${endStr})</span>`;
        }

        let smartSummary = fav.desc;
        if (smartSummary.includes('다.')) smartSummary = smartSummary.split('다.')[0] + '다.'; 
        else if (smartSummary.length > 70) smartSummary = smartSummary.substring(0, 70) + "..."; 

        let itemLink = fav.link;
        if (!itemLink) {
            itemLink = (fav.id && fav.id.startsWith('WLF')) ? `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${fav.id}` : 'https://www.bokjiro.go.kr';
        }

        CALENDAR_EVENTS[eventDate] = {
            id: fav.id, 
            title: `♥️ ${fav.title}`, 
            description: smartSummary, 
            startDate: startDateStr, 
            endDate: endDateStr, 
            eligibility: fav.eligibility || "상세내용 참고", 
            link: itemLink 
        };
        
        fav.displayDate = displayDate;
        fav.eventDateKey = eventDate; // 클릭 시 어떤 데이터를 열어야 하는지 알기 위해 저장
    });

    // 💡 2. h4 태그(제목)에 onclick 이벤트와 손가락(포인터) 커서를 추가하여 누를 수 있게 만들었습니다.
    container.innerHTML = favorites.map(fav => `
        <div style="position: relative; padding: 15px; margin-bottom: 12px; border-radius: 12px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #ff4b4b;">
            <button onclick="removeFavorite('${fav.id}')" style="position: absolute; top: 12px; right: 12px; background: #f0f0f0; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; color: #555; padding: 5px 8px;">❌ 취소</button>
            
            <h4 onclick="showEventPopup('${fav.eventDateKey}')" style="margin: 0 0 6px 0; font-size: 15px; color: #333; padding-right: 55px; word-break: keep-all; cursor: pointer;">
                ♥️ ${fav.title}${fav.displayDate || ''}
            </h4>
            
            <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.4;">${fav.desc.substring(0, 65)}...</p>
        </div>
    `).join('');
};

// [홈 검색창 연동] 홈 화면에서 검색하면 채팅 탭으로 넘어가서 질문을 자동으로 대신 쳐주는 함수 
window.startChatFromHome = function() {
    const homeInput = document.getElementById('home-search-input');
    if (!homeInput || homeInput.value.trim() === '') { switchSection('chat'); return; }

    const question = homeInput.value.trim();
    switchSection('chat');

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = question;
        const sendButton = document.querySelector('.send-button');
        if (sendButton) setTimeout(() => { sendButton.click(); }, 100);
    }
    homeInput.value = '';
};

// [DB 통신 및 화면 동기화] 내 찜 목록을 서버에서 불러와서 브라우저(로컬 스토리지)에 덮어쓰고 화면을 새로고침
window.loadFavoritesFromDB = async function() {
    try {
        const response = await fetch(`http://localhost:8080/api/favorites/${CURRENT_USER_ID}`);
        
        if (response.ok) {
            const favorites = await response.json();
            const mappedFavorites = favorites.map(fav => ({
                id: fav.servId, title: fav.title, desc: fav.description, link: fav.link
            }));

            localStorage.setItem('welfareFavorites', JSON.stringify(mappedFavorites));
            
            if (typeof renderFavoriteBenefits === 'function') renderFavoriteBenefits(); 
            if (typeof renderCalendar === 'function') renderCalendar(); 
            updateChatHeartIcons();
        }
    } catch (error) { console.error("🚨 DB 불러오기 실패:", error); }
};

// [채팅창 하트 색칠] 채팅창 안의 모든 하트(🤍)를 검사해서, 내가 찜한 목록에 있으면 빨간 하트(♥️)로 색칠 
function updateChatHeartIcons() {
    const savedFavorites = JSON.parse(localStorage.getItem('welfareFavorites')) || [];
    const savedIds = savedFavorites.map(item => item.id);
    
    document.querySelectorAll('span[id^="heart-"]').forEach(btn => {
		const id = btn.id.replace('heart-', ''); 
		        
		        if (savedIds.includes(id)) {
		            btn.innerHTML = '♥️'; 
		        } else {
		            btn.innerHTML = '🤍'; 
		        }
    });
}