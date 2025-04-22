javascript:(function(){
    // 이미 실행 중인지 확인
    if (document.getElementById('udl-accessibility-panel')) {
      document.getElementById('udl-accessibility-panel').remove();
      removeHighlights();
      return;
    }
    
    // API 키 확인 및 입력 요청
    let userApiKey = sessionStorage.getItem('udl_api_key');
    if (!userApiKey) {
      userApiKey = prompt('UDL 분석을 위한 API KEY를 입력해주세요.');
      if (!userApiKey) {
        alert('API KEY가 입력되지 않았습니다. UDL 분석을 실행할 수 없습니다.');
        return;
      }
      sessionStorage.setItem('udl_api_key', userApiKey);
    }
  
    // axe-core 스크립트 로드 (CDN 사용)
    function loadAxeCore() {
      return new Promise((resolve, reject) => {
        if (window.axe) {
          return resolve(window.axe);
        }
        
        const axeScript = document.createElement('script');
        axeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js';
        axeScript.onload = () => resolve(window.axe);
        axeScript.onerror = () => reject(new Error('axe-core 로드 실패'));
        document.head.appendChild(axeScript);
      });
    }
  
    // Gemini API 키
    const API_KEY = userApiKey;
    
    // 한국형 웹 콘텐츠 접근성 지침 2.2 카테고리
    const KWCAG22 = {
      perception: {
        name: "인식의 용이성",
        items: [
          { id: "1.1.1", name: "적절한 대체 텍스트 제공", desc: "텍스트 아닌 콘텐츠는 그 의미나 용도를 인식할 수 있도록 대체 텍스트를 제공해야 한다." },
          { id: "1.2.1", name: "자막 제공", desc: "멀티미디어 콘텐츠에는 자막, 대본 또는 수어를 제공해야 한다." },
          { id: "1.3.1", name: "표의 구성", desc: "표는 이해하기 쉽게 구성해야 한다." },
          { id: "1.3.2", name: "콘텐츠의 선형구조", desc: "콘텐츠는 논리적인 순서로 제공해야 한다." },
          { id: "1.3.3", name: "명확한 지시사항 제공", desc: "지시사항은 모양, 크기, 위치, 방향, 색, 소리 등에 관계없이 인식될 수 있어야 한다." },
          { id: "1.4.1", name: "색에 무관한 콘텐츠 인식", desc: "콘텐츠는 색에 관계없이 인식될 수 있어야 한다." },
          { id: "1.4.2", name: "자동 재생 금지", desc: "자동으로 소리가 재생되지 않아야 한다." },
          { id: "1.4.3", name: "텍스트 콘텐츠의 명도 대비", desc: "텍스트 콘텐츠와 배경 간의 명도 대비는 4.5 대 1 이상이어야 한다." },
          { id: "1.4.4", name: "콘텐츠 간의 구분", desc: "이웃한 콘텐츠는 구별될 수 있어야 한다." }
        ]
      },
      operation: {
        name: "운용의 용이성",
        items: [
          { id: "2.1.1", name: "키보드 사용 보장", desc: "모든 기능은 키보드만으로도 사용할 수 있어야 한다." },
          { id: "2.1.2", name: "초점 이동과 표시", desc: "키보드에 의한 초점은 논리적으로 이동해야 하며, 시각적으로 구별할 수 있어야 한다." },
          { id: "2.1.3", name: "조작 가능", desc: "사용자 입력 및 컨트롤은 조작 가능하도록 제공되어야 한다." },
          { id: "2.1.4", name: "문자 단축키", desc: "문자 단축키는 오동작으로 인한 오류를 방지하여야 한다." },
          { id: "2.2.1", name: "응답시간 조절", desc: "시간제한이 있는 콘텐츠는 응답시간을 조절할 수 있어야 한다." },
          { id: "2.2.2", name: "정지 기능 제공", desc: "자동으로 변경되는 콘텐츠는 움직임을 제어할 수 있어야 한다." },
          { id: "2.3.1", name: "깜빡임과 번쩍임 사용 제한", desc: "초당 3~50회 주기로 깜빡이거나 번쩍이는 콘텐츠를 제공하지 않아야 한다." },
          { id: "2.4.1", name: "반복 영역 건너뛰기", desc: "콘텐츠의 반복되는 영역은 건너뛸 수 있어야 한다." },
          { id: "2.4.2", name: "제목 제공", desc: "페이지, 프레임, 콘텐츠 블록에는 적절한 제목을 제공해야 한다." },
          { id: "2.4.3", name: "적절한 링크 텍스트", desc: "링크 텍스트는 용도나 목적을 이해할 수 있도록 제공해야 한다." },
          { id: "2.4.4", name: "고정된 참조 위치 정보", desc: "전자출판문서 형식의 웹 페이지는 각 페이지로 이동할 수 있는 기능이 있어야 하고, 서식이나 플랫폼에 상관없이 참조 위치 정보를 일관되게 제공ㆍ유지해야 한다." },
          { id: "2.5.1", name: "단일 포인터 입력 지원", desc: "다중 포인터 또는 경로기반 동작을 통한 입력은 단일 포인터 입력으로도 조작할 수 있어야 한다." },
          { id: "2.5.2", name: "포인터 입력 취소", desc: "단일 포인터 입력으로 실행되는 기능은 취소할 수 있어야 한다." },
          { id: "2.5.3", name: "레이블과 네임", desc: "텍스트 또는 텍스트 이미지가 포함된 레이블이 있는 사용자 인터페이스 구성요소는 네임에 시각적으로 표시되는 해당 텍스트를 포함해야 한다." },
          { id: "2.5.4", name: "동작기반 작동", desc: "동작기반으로 작동하는 기능은 사용자 인터페이스 구성요소로 조작할 수 있고, 동작기반 기능을 비활성화할 수 있어야 한다." }
        ]
      },
      comprehension: {
        name: "이해의 용이성",
        items: [
          { id: "3.1.1", name: "기본 언어 표시", desc: "주로 사용하는 언어를 명시해야 한다." },
          { id: "3.2.1", name: "사용자 요구에 따른 실행", desc: "사용자가 의도하지 않은 기능(새 창, 초점에 의한 맥락 변화 등)은 실행되지 않아야 한다." },
          { id: "3.2.2", name: "찾기 쉬운 도움 정보", desc: "도움 정보가 제공되는 경우, 각 페이지에서 동일한 상대적인 순서로 접근할 수 있어야 한다." },
          { id: "3.3.1", name: "오류 정정", desc: "입력 오류를 정정할 수 있는 방법을 제공해야 한다." },
          { id: "3.3.2", name: "레이블 제공", desc: "사용자 입력에는 대응하는 레이블을 제공해야 한다." },
          { id: "3.3.3", name: "접근 가능한 인증", desc: "인증 과정은 인지 기능 테스트에만 의존해서는 안 된다." },
          { id: "3.3.4", name: "반복 입력 정보", desc: "반복되는 입력 정보는 자동 입력 또는 선택 입력할 수 있어야 한다." }
        ]
      },
      robustness: {
        name: "견고성",
        items: [
          { id: "4.1.1", name: "마크업 오류 방지", desc: "마크업 언어의 요소는 열고 닫음, 중첩 관계 및 속성 선언에 오류가 없어야 한다." },
          { id: "4.2.1", name: "웹 애플리케이션 접근성 준수", desc: "콘텐츠에 포함된 웹 애플리케이션은 접근성이 있어야 한다." }
        ]
      }
    };
  
    // UDL 원칙
    const UDL_PRINCIPLES = {
      engagement: {
        name: "다양한 방식의 학습 참여 수단",
        desc: "학습자의 흥미와 동기를 유발하고 적극적인 참여를 촉진하기 위해 다양한 방법 제공",
        suggestions: [
          "흥미 유발을 위한 선택권 제공하기",
          "지속적으로 노력하고 끈기를 갖도록 하는 선택권 제공하기",
          "자기조절 능력을 키우기 위한 선택권 제공하기"
        ]
      },
      representation: {
        name: "다양한 방식의 표상 수단",
        desc: "학습 내용을 다양한 방식으로 제공하여 모든 학습자가 정보를 이해할 수 있도록 지원",
        suggestions: [
          "정보를 인지하는 것의 선택권 제공하기",
          "언어와 기호의 선택권 제공하기",
          "이해를 돕기 위해 다양한 선택권 제공하기"
        ]
      },
      action: {
        name: "다양한 방식의 행동과 표현 수단",
        desc: "학습자가 자신의 지식과 이해를 표현하는 방법에 다양한 선택권 제공",
        suggestions: [
          "신체적 표현 방식에서 선택권 제공하기",
          "표현과 의사소통의 선택권 제공하기",
          "실행기능에 따른 선택권 제공하기"
        ]
      }
    };
  
    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
      /* 패널 기본 스타일 */
      #udl-accessibility-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 600px;
        max-width: 90vw;
        height: 90vh;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        z-index: 99999;
        overflow: hidden;
        resize: both;
        min-width: 300px;
        min-height: 300px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #212529;
      }
      .panel-header {
        padding: 16px 20px;
        background: linear-gradient(135deg, #3a7bd5, #2c5282);
        color: white;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
      }
      .panel-title {
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .panel-controls {
        display: flex;
        gap: 8px;
      }
      .panel-btn {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .panel-btn:hover {
        background: rgba(255,255,255,0.2);
      }
      .panel-tabs {
        display: flex;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        padding: 0 4px;
      }
      .panel-tabs button {
        flex: 1;
        padding: 12px 8px;
        border: none;
        background: none;
        cursor: pointer;
        font-weight: 500;
        color: #495057;
        position: relative;
        transition: all 0.2s;
      }
      .panel-tabs button:hover {
        color: #3a7bd5;
        background-color: rgba(58, 123, 213, 0.05);
      }
      .panel-tabs button.tab-active {
        color: #3a7bd5;
        font-weight: 600;
      }
      .panel-tabs button.tab-active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 10%;
        width: 80%;
        height: 3px;
        background-color: #3a7bd5;
        border-radius: 3px 3px 0 0;
      }
      .tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background-color: #ffffff;
      }
      .panel-footer {
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background-color: #f8f9fa;
        gap: 8px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 4px;
        border: none;
        font-weight: 500;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .primary-btn {
        background-color: #3a7bd5;
        color: white;
      }
      .primary-btn:hover {
        background-color: #2c5282;
      }
      .secondary-btn {
        background-color: #e9ecef;
        color: #495057;
      }
      .secondary-btn:hover {
        background-color: #ced4da;
      }
      .contrast-summary {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #e9ecef;
      }
      .contrast-summary h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 16px;
        color: #343a40;
      }
      .contrast-summary p {
        margin: 8px 0;
        color: #495057;
      }
      .progress-bar {
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 10px;
      }
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #3a7bd5, #00c6ff);
        transition: width 0.5s ease;
      }
      .contrast-section {
        margin-bottom: 24px;
      }
      .section-header {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9ecef;
        color: #343a40;
      }
      .contrast-item {
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-left: 4px solid;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .contrast-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.05);
      }
      .contrast-fail {
        border-color: #fa5252;
        background: rgba(250, 82, 82, 0.05);
      }
      .contrast-pass {
        border-color: #40c057;
        background: rgba(64, 192, 87, 0.05);
      }
      .color-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
      }
      .color-preview {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.1);
      }
      .color-text {
        font-family: monospace;
        font-size: 12px;
        color: #495057;
      }
      .label {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        margin-right: 6px;
        color: white;
      }
      .label-aa { background: #40c057; }
      .label-aaa { background: #339af0; }
      .label-fail { background: #fa5252; }
      
      .item-highlight {
        outline: 3px solid #ff922b !important;
        outline-offset: 2px;
        position: relative;
        z-index: 9000;
      }
      
      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background-color: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 12px;
        cursor: pointer;
        border-left: 4px solid #3a7bd5;
      }
      .category-header h3 {
        margin: 0;
        font-size: 15px;
      }
      .category-header .icon {
        transition: transform 0.3s;
      }
      .category-header.collapsed .icon {
        transform: rotate(-90deg);
      }
      .category-content {
        margin-left: 16px;
        margin-bottom: 20px;
        overflow: hidden;
        transition: max-height 0.3s;
      }
      .category-content.collapsed {
        max-height: 0;
        margin-bottom: 0;
      }
      
      .guideline-item {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 6px;
        background-color: rgba(233, 236, 239, 0.3);
        border-left: 3px solid #6c757d;
        cursor: pointer;
        transition: all 0.2s;
      }
      .guideline-item:hover {
        background-color: rgba(233, 236, 239, 0.6);
      }
      .guideline-item.fail {
        border-left-color: #fa5252;
        background-color: rgba(250, 82, 82, 0.05);
      }
      .guideline-item.pass {
        border-left-color: #40c057;
        background-color: rgba(64, 192, 87, 0.05);
      }
      .guideline-item h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .guideline-item p {
        margin: 0;
        font-size: 13px;
        color: #495057;
      }
      
      .udl-category {
        margin-bottom: 24px;
      }
      .udl-category h3 {
        font-size: 16px;
        margin-top: 0;
        margin-bottom: 12px;
        color: #343a40;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9ecef;
      }
      .udl-category p {
        color: #495057;
        margin-bottom: 12px;
      }
      .udl-suggestion {
        background: #f1f8ff;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 10px;
        border-left: 3px solid #3a7bd5;
      }
      
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background-color: #ffffff;
        /* 스크롤 문제 해결을 위한 추가 속성 */
        overflow-anchor: auto;
        scroll-behavior: auto !important;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        scrollbar-width: thin;
        position: relative;
        padding-bottom: 100px !important; /* 하단 여백 추가 */
        max-height: 60vh;  /* 뷰포트 높이의 60%로 제한 */
        min-height: 300px; /* 최소 높이 설정 */
        margin-bottom: 10px;
      }

      /* 메시지 겹침 방지 */
      .chat-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        word-break: break-word;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 4px;
        z-index: 1;
      }
      .chat-user {
        align-self: flex-end;
        background-color: #3a7bd5;
        color: white;
        border-bottom-right-radius: 4px;
      }
      .chat-bot {
        align-self: flex-start;
        background-color: #f1f3f5;
        color: #343a40;
        border-bottom-left-radius: 4px;
      }
      
      .chat-controls {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;
        border-top: 1px solid #e9ecef;
        background-color: #f8f9fa;
      }
      .control-btn {
        padding: 6px 12px;
        background-color: #f8f9fa;
        color: #495057;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .control-btn:hover {
        background-color: #e9ecef;
      }
      
      .chat-input {
        display: flex;
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background-color: #ffffff;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        flex-shrink: 0;
      }
      .chat-input input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 24px;
        font-size: 13px;
        margin-right: 8px;
        transition: border-color 0.2s;
      }
      .chat-input input:focus {
        outline: none;
        border-color: #3a7bd5;
        box-shadow: 0 0 0 3px rgba(58, 123, 213, 0.1);
      }
      .chat-input button {
        padding: 8px 14px;
        background-color: #3a7bd5;
        color: white;
        border: none;
        border-radius: 24px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        transition: background 0.2s;
        min-width: 60px; /* 버튼의 최소 너비 설정 */
        white-space: nowrap; /* 텍스트 줄바꿈 방지 */
        overflow: visible; /* 내용이 넘치더라도 표시 */
      }
      .chat-input button:hover {
        background-color: #2c5282;
      }
      
      .code-block {
        background-color: #1E1E1E;
        padding: 10px;
        border-radius: 4px;
        margin: 8px 0;
        overflow-x: auto;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 11px;
        line-height: 1.4;
        max-height: 300px;
        border: 1px solid #333;
      }
      .code-line {
        color: #D4D4D4;
        white-space: pre;
      }
      .code-comment {
        color: #6A9955;
      }
      .code-keyword {
        color: #569CD6;
      }
      .code-string {
        color: #CE9178;
      }
      
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        color: #6c757d;
      }
      .loading::after {
        content: '';
        width: 20px;
        height: 20px;
        margin-left: 10px;
        border: 2px solid #ced4da;
        border-radius: 50%;
        border-top-color: #3a7bd5;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .report-section {
        margin-bottom: 20px;
      }
      .report-section h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      .chat-bot p {
        margin: 0 0 8px 0;
        font-size: 13px;
      }
      .chat-bot h1, .chat-bot h2, .chat-bot h3, .chat-bot h4 {
        font-size: 15px;
        margin: 12px 0 8px 0;
      }
      .chat-bot ul, .chat-bot ol {
        padding-left: 20px;
        margin: 8px 0;
      }
      .chat-bot li {
        font-size: 13px;
        margin-bottom: 4px;
      }
      
      /* 채팅 UI 개선 */
      #tab-content-chat {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        position: relative;
      }
      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-bottom: 1px solid #e9ecef;
        background-color: #f8f9fa;
        z-index: 2;
        flex-shrink: 0;
      }
      .chat-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
      }
      .chat-action-btn {
        border: none;
        background: none;
        color: #6c757d;
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .chat-action-btn:hover {
        background-color: #e9ecef;
        color: #495057;
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        padding-bottom: 100px !important; /* 입력창보다 더 여유있게 수정 */
        display: flex;
        flex-direction: column;
        gap: 16px;
        background-color: #ffffff;
        height: calc(100% - 50px); /* 헤더 높이 제외 */
        /* 스크롤 문제 해결을 위한 추가 속성 */
        overflow-anchor: auto;
        scroll-behavior: auto !important;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        max-height: 60vh;  /* 뷰포트 높이의 60%로 제한 */
        min-height: 300px; /* 최소 높이 설정 */
        scrollbar-width: thin;
        position: relative;
        overflow-x: hidden; /* 가로 스크롤 방지 */
      }
      .chat-input {
        display: flex;
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background-color: #ffffff;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        flex-shrink: 0;
      }
      .chat-input input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 24px;
        font-size: 13px;
        margin-right: 8px;
        transition: border-color 0.2s;
      }
      .chat-input input:focus {
        outline: none;
        border-color: #3a7bd5;
        box-shadow: 0 0 0 3px rgba(58, 123, 213, 0.1);
      }
      .chat-input button {
        padding: 8px 14px;
        background-color: #3a7bd5;
        color: white;
        border: none;
        border-radius: 24px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        transition: background 0.2s;
        min-width: 60px; /* 버튼의 최소 너비 설정 */
        white-space: nowrap; /* 텍스트 줄바꿈 방지 */
        overflow: visible; /* 내용이 넘치더라도 표시 */
      }
      .chat-input button:hover {
        background-color: #2c5282;
      }
      
      /* 개선된 요약 통계 스타일 */
      .contrast-summary-content {
        padding: 14px;
        background-color: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 16px;
      }
      .stats-row {
        display: flex;
        gap: 20px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      
      /* 탭 공지사항 스타일 수정 */
      .contrast-tab-notice {
        color: #6c757d;
        font-size: 12px;
        margin: 5px 0;
        font-style: italic;
        text-align: right;
      }
      
      /* 개선된 툴팁 스타일 */
      .contrast-tooltip {
        position: absolute;
        display: none;
        width: 320px;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.15);
        z-index: 100;
        padding: 0;
        right: 0;
        top: calc(100% + 5px);
        text-align: left;
      }
      .tooltip-content {
        padding: 12px;
      }
      .tooltip-header {
        font-weight: 600;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9ecef;
        color: #343a40;
      }
      .tooltip-item {
        margin-bottom: 8px;
        line-height: 1.4;
        font-size: 12px;
      }
      .tooltip-label {
        font-weight: 600;
        color: #495057;
      }
      
      /* 수동 컬러 피커 스타일 */
      .manual-color-picker-tool {
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #dee2e6;
      }
      
      .color-picker-info {
        margin-bottom: 12px;
      }
      
      .info-text {
        font-size: 13px;
        color: #495057;
        line-height: 1.5;
      }
      
      .manual-color-picker-tool h3 {
        font-size: 14px;
        margin-top: 0;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .color-picker-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .color-picker-row {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      .color-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .color-input-group label {
        font-size: 12px;
        white-space: nowrap;
      }
      .color-input-group input[type="color"] {
        width: 0;
        height: 0;
        padding: 0;
        border: none;
        overflow: hidden;
        position: absolute;
        opacity: 0;
      }
      
      .color-button {
        width: 40px;
        height: 24px;
        padding: 0;
        border: 1px solid #ced4da;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .color-preview-btn {
        display: block;
        width: 100%;
        height: 100%;
      }
      
      .color-input-group input[type="text"] {
        width: 80px;
        height: 24px;
        padding: 0 8px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
      }
      .color-preview-area {
        display: flex;
        gap: 15px;
        align-items: center;
      }
      .manual-color-sample {
        padding: 10px 15px;
        border-radius: 4px;
        min-width: 120px;
        text-align: center;
        font-size: 14px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
      }
      .manual-contrast-result {
        font-size: 13px;
      }
      .contrast-result-text {
        display: flex;
        align-items: center;
        font-size: 13px;
        gap: 6px;
      }
      
      .manual-contrast-status {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .manual-contrast-status.pass {
        background-color: #e8f5e9;
        color: #2e7d32;
      }
      
      .manual-contrast-status.partial {
        background-color: #fff3e0;
        color: #e67700;
      }
      
      .manual-contrast-status.fail {
        background-color: #ffebee;
        color: #d32f2f;
      }
      
      /* 색상 코드 칩 디자인 개선 */
      .color-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        border-radius: 4px;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
      }
      .color-preview {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
      }
      .color-code {
        font-family: monospace;
        font-size: 11px;
      }
      
      /* 대비율 값 디자인 개선 */
      .ratio-value {
        font-size: 13px;
        display: flex;
        flex-direction: column;
        text-align: left;
      }
      .criteria-label {
        font-size: 11px;
        margin-bottom: 2px;
        color: #6c757d;
      }
      
      /* 컬러 샘플 박스 개선 */
      .color-sample-box {
        padding: 8px 12px;
        border-radius: 4px;
        text-align: left;
        min-width: 60px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
      }
      
      /* 컨트라스트 정보 레이아웃 개선 */
      .contrast-info-row {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      /* 기존 스타일 끝 */
    `;
    document.head.appendChild(style);
  
    // 패널 생성
    const panel = document.createElement('div');
    panel.id = 'udl-accessibility-panel';
    panel.style.cssText = `
      position: fixed;
      z-index: 9999;
      top: 20px;
      right: 20px;
      width: 600px;
      height: 900px;
      background-color: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.15);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      resize: both;
    `;
    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">접근성 검사</h2>
        <div class="panel-controls">
          <button class="panel-btn" id="minimize-panel" title="최소화">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button class="panel-btn" id="close-panel" title="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="panel-tabs">
        <button id="tab-contrast" class="tab-active">명도 대비</button>
        <button id="tab-wcag">웹 접근성 항목</button>
        <button id="tab-udl">AI 제안</button>
        <button id="tab-colorblind">색맹 시뮬레이션</button>
        <button id="tab-chat">AI 챗봇</button>
      </div>
      <div id="tab-content-contrast" class="tab-content">
        <div class="loading">검사 중...</div>
      </div>
      <div id="tab-content-wcag" class="tab-content" style="display:none;">
        <div class="loading">검사 중...</div>
      </div>
      <div id="tab-content-udl" class="tab-content" style="display:none;">
        <div class="loading">분석 중...</div>
      </div>
      <div id="tab-content-colorblind" class="tab-content" style="display:none;">
        <div class="loading">색맹 시뮬레이션 도구 로딩 중...</div>
      </div>
      <div id="tab-content-chat" class="tab-content" style="display:none;">
        <div class="chat-header">
          <h3>UDL 및 웹 접근성 문의</h3>
          <button id="reset-chat-btn" class="chat-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            새 대화 시작
          </button>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
          <input type="text" id="chat-input-field" placeholder="웹 접근성에 대해 물어보세요" />
          <button id="chat-send-btn">전송</button>
        </div>
      </div>
      <div class="panel-footer">
        <div class="left-buttons">
          <!-- 채팅 관련 버튼은 여기에 동적으로 추가됩니다 -->
          <button id="download-chat-btn" class="button secondary-btn chat-control-btn" style="display:none;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            대화 내용 다운로드
          </button>
          <button id="download-results" class="button secondary-btn contrast-only-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            보고서 다운로드
          </button>
        </div>
        <div class="right-buttons">
          <button class="button primary-btn" id="run-full-scan">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            검사 새로고침
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  
    // 드래그 핸들
    (function(){
      const header = panel.querySelector('.panel-header');
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 50;  // 초기 위치
      let yOffset = 50;  // 초기 위치
      
      // 초기 위치 설정
      panel.style.position = 'fixed';
      panel.style.left = '50px';
      panel.style.top = '50px';
      
      function setTranslate(xPos, yPos) {
        // 화면 경계 체크
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        const headerHeight = header.offsetHeight;
        
        // x축 제한
        if (xPos < 0) xPos = 0;
        if (xPos > window.innerWidth - panelWidth) {
          xPos = window.innerWidth - panelWidth;
        }
        
        // y축 제한 (헤더는 항상 화면 내에 유지)
        if (yPos < 0) yPos = 0;
        if (yPos > window.innerHeight - headerHeight) {
          yPos = window.innerHeight - headerHeight;
        }
        
        xOffset = xPos;
        yOffset = yPos;
        panel.style.left = xPos + 'px';
        panel.style.top = yPos + 'px';
      }
      
      function dragStart(e) {
        if (e.target.closest('.panel-btn')) return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === header || e.target.closest('.panel-header')) {
          isDragging = true;
        }
        
        e.preventDefault();
      }
      
      function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      }
      
      function drag(e) {
        if (isDragging) {
          e.preventDefault();
          
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          
          setTranslate(currentX, currentY);
        }
      }
      
      // 이벤트 리스너
      header.addEventListener('mousedown', dragStart);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);
      
      // 창 크기 변경 시 패널 위치 조정
      window.addEventListener('resize', () => {
        setTranslate(xOffset, yOffset);
      });
    })();
  
    // 최소화 / 닫기 기능
    let minimized = false;
    document.getElementById('minimize-panel').onclick = () => {
      minimized = !minimized;
      const contents = panel.querySelectorAll('.tab-content, .panel-tabs, .panel-footer');
      contents.forEach(el => el.style.display = minimized ? 'none' : '');
      if (minimized) {
        panel.style.height = 'auto';
        panel.style.resize = 'none';
      } else {
        panel.style.height = 'calc(90vh)';
        panel.style.resize = 'both';
      }
      document.getElementById('minimize-panel').innerHTML = minimized ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"></polyline><polyline points="7 6 12 11 17 6"></polyline></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      document.getElementById('minimize-panel').title = minimized ? '확장' : '최소화';
    };
    
    document.getElementById('close-panel').onclick = () => {
      panel.remove();
      removeHighlights();
    };
  
    // 탭 전환
    function activateTab(tabId) {
      // 모든 탭 컨텐츠 숨기기
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      
      // 모든 탭 비활성화
      document.querySelectorAll('.panel-tabs button').forEach(tab => {
        tab.classList.remove('tab-active');
      });
      
      // 선택한 탭 활성화
      document.getElementById('tab-' + tabId).classList.add('tab-active');
      document.getElementById('tab-content-' + tabId).style.display = 'block';
      
      // 탭 내용 로드
      if (tabId === 'contrast' && !document.getElementById('tab-content-contrast').innerHTML.includes('contrast-summary')) {
        checkColorContrast();
      }
      if (tabId === 'wcag' && !document.getElementById('tab-content-wcag').innerHTML.includes('category-header')) {
        analyzeWCAG();
      }
      if (tabId === 'udl' && !document.getElementById('tab-content-udl').innerHTML.includes('udl-category')) {
        analyzeForUDL();
      }
      if (tabId === 'colorblind' && !document.getElementById('tab-content-colorblind').innerHTML.includes('colorblind-tester')) {
        checkColorBlindness();
      }
      if (tabId === 'chat') {
        initChat();
      }
      
      // 모든 특수 버튼 숨기기
      document.querySelectorAll('.contrast-only-btn, .chat-control-btn').forEach(btn => {
        btn.style.display = 'none';
      });
      
      // 현재 탭에 따라 필요한 버튼만 표시
      if (tabId === 'contrast') {
        document.querySelectorAll('.contrast-only-btn').forEach(btn => {
          btn.style.display = 'inline-flex';
        });
      } else if (tabId === 'chat') {
        document.querySelectorAll('.chat-control-btn').forEach(btn => {
          btn.style.display = 'inline-flex';
        });
      }
    }
    
    // 탭 클릭 이벤트 등록
    document.getElementById('tab-contrast').onclick = () => activateTab('contrast');
    document.getElementById('tab-wcag').onclick = () => activateTab('wcag');
    document.getElementById('tab-udl').onclick = () => activateTab('udl');
    document.getElementById('tab-colorblind').onclick = () => activateTab('colorblind');
    document.getElementById('tab-chat').onclick = () => activateTab('chat');
  
    // 다운로드/전체검사
    document.getElementById('download-results').onclick = () => downloadReport();
    document.getElementById('run-full-scan').onclick = () => runFullScan();
  
    // 초기 대비 검사
    checkColorContrast();
  
    //── 기능 함수들 ─────────────────────────────────────────
  
    function checkColorContrast() {
      const contrastContent = document.getElementById('tab-content-contrast');
      contrastContent.innerHTML = '<div class="loading">색상 대비 검사 중...</div>';
      
      setTimeout(() => {
        // 텍스트 요소 찾기
        const els = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span, li, td, th, div, label, button'))
          .filter(el => {
            if (el.closest('#udl-accessibility-panel')) return false;
            const txt = el.textContent.trim(); 
            if (!txt) return false;
            
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetParent !== null;
          });
  
        // 결과 계산
        const results = els.map(el => {
          const s = window.getComputedStyle(el);
          let bg = s.backgroundColor;
          let bgElement = el;
          
          // 배경색 찾기 개선 - 하나의 요소만 확인하는 것이 아니라 모든 부모 요소 확인
          if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
            let p = el.parentElement;
            while (p) {
              const computedStyle = window.getComputedStyle(p);
              const pb = computedStyle.backgroundColor;
              if (pb !== 'transparent' && pb !== 'rgba(0, 0, 0, 0)') {
                bg = pb;
                bgElement = p;
                break;
              }
              p = p.parentElement;
            }
          }
          
          // 기본 배경색 설정 - document의 배경색을 확인
          if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
            const docStyle = window.getComputedStyle(document.body);
            bg = docStyle.backgroundColor;
            if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
              bg = 'rgb(255, 255, 255)'; // 기본값
            }
            bgElement = document.body;
          }
          
          const tc = parseColor(s.color);
          const bc = parseColor(bg);
          const cr = calculateContrast(tc, bc);
          
          const fs = parseFloat(s.fontSize);
          const fw = s.fontWeight;
          const large = fs >= 18 || (fs >= 14 && (parseInt(fw) >= 700 || fw === 'bold'));
          
          // HTML 코드 추출 - 텍스트와 배경 요소 모두 포함
          const elementHTML = el.outerHTML.split('>')[0] + '>';
          const bgElementHTML = bgElement !== el ? bgElement.outerHTML.split('>')[0] + '>' : '';
          
          return {
            el, 
            bgElement,
            text: el.textContent.trim().slice(0, 30) + (el.textContent.length > 30 ? '...' : ''),
            contrast: cr, 
            aa: large ? cr >= 3 : cr >= 4.5, 
            aaa: large ? cr >= 4.5 : cr >= 7,
            fs, 
            fw,
            textColor: s.color,
            textColorHex: rgbToHex(tc.r, tc.g, tc.b),
            bgColor: bg,
            bgColorHex: rgbToHex(bc.r, bc.g, bc.b),
            elementHTML,
            bgElementHTML
          };
        });
  
        displayContrastResults(results);
      }, 500);
    }
  
    function rgbToHex(r, g, b) {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
  
    function parseColor(c) {
      // RGB 형식 처리
      const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
      }
      
      // 16진수 색상 코드 처리 (#rrggbb 또는 #rgb)
      if (c.startsWith('#')) {
        let hex = c.substring(1);
        
        // #rgb 형식을 #rrggbb 형식으로 변환
        if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        // 16진수 색상 코드를 RGB로 변환
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return { r, g, b };
      }
      
      // 기본값 (검은색) 반환
      return { r: 0, g: 0, b: 0 };
    }
    
    function calculateLuminance({r, g, b}) {
      [r, g, b] = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    function calculateContrast(a, b) {
      const L1 = calculateLuminance(a);
      const L2 = calculateLuminance(b);
      return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
    }
  
    function displayContrastResults(results) {
      const c = document.getElementById('tab-content-contrast');
      c.innerHTML = '';
      
      const fails = results.filter(r => !r.aa);
      const passes = results.filter(r => r.aa);
      const total = results.length;
      const pct = total ? Math.round(passes.length / total * 100) : 0;
  
      // 색상 대비 평가 기준 설명 추가
      const contrastGuide = document.createElement('div');
      contrastGuide.className = 'contrast-guide';
      contrastGuide.innerHTML = `
        <div class="contrast-guide-header">
          <h3>색상 대비 평가 기준 <span class="info-icon" id="contrast-info-icon">ⓘ</span></h3>
          <div class="contrast-tooltip" id="contrast-tooltip">
            <div class="tooltip-content">
              <div class="tooltip-header">텍스트 콘텐츠의 명도 대비 기준</div>
              <div class="tooltip-item"><span class="tooltip-label">일반 텍스트:</span> 명도 대비 <strong>4.5:1</strong> 이상</div>
              <div class="tooltip-item"><span class="tooltip-label">큰 텍스트(18pt 이상 또는 14pt 이상 굵은 글꼴):</span> 명도 대비 <strong>3:1</strong> 이상</div>
              <div class="tooltip-item"><span class="tooltip-label">화면 확대 가능 콘텐츠:</span> 명도 대비 <strong>3:1</strong> 이상</div>
              <div class="tooltip-item"><span class="tooltip-label">예외:</span> 로고, 장식 목적의 콘텐츠, 마우스/키보드 포커스 시 명도 대비가 커지는 콘텐츠 등</div>
            </div>
          </div>
        </div>
      `;
      c.appendChild(contrastGuide);
      
      // 툴팁 동작 설정
      setTimeout(() => {
        const infoIcon = document.getElementById('contrast-info-icon');
        const tooltip = document.getElementById('contrast-tooltip');
        if (infoIcon && tooltip) {
          infoIcon.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
          });
          infoIcon.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
          });
          infoIcon.addEventListener('focus', () => {
            tooltip.style.display = 'block';
          });
          infoIcon.addEventListener('blur', () => {
            tooltip.style.display = 'none';
          });
          // 접근성을 위한 키보드 이벤트 추가
          infoIcon.tabIndex = 0;
          infoIcon.setAttribute('role', 'button');
          infoIcon.setAttribute('aria-label', '색상 대비 평가 기준 정보');
        }
      }, 100);

      // 요약 정보 (간소화)
      const sum = document.createElement('div');
      sum.className = 'contrast-summary';
      sum.innerHTML = `
        <div class="contrast-summary-content">
          <div class="summary-stats">
            <div class="stats-row">
              <span>검사된 요소: <strong>${total}개</strong></span>
              <span class="pass-stat"><span class="dot pass-dot"></span> 통과: <strong>${passes.length}개</strong> (${pct}%)</span>
              <span class="fail-stat"><span class="dot fail-dot"></span> 실패: <strong>${fails.length}개</strong> (${100 - pct}%)</span>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      `;
      c.appendChild(sum);
  
      // 탭 컨테이너 생성
      const tabContainer = document.createElement('div');
      tabContainer.className = 'contrast-tabs';
      tabContainer.innerHTML = `
        <div class="contrast-tab-header">
          <div class="contrast-tab-header-content">
            <div class="tab-buttons">
              <button id="tab-fail" class="contrast-tab-btn active" data-tab="fail">
                <span class="tab-icon fail-icon">⚠</span> 부적합 항목 (${fails.length})
              </button>
              <button id="tab-pass" class="contrast-tab-btn" data-tab="pass">
                <span class="tab-icon pass-icon">✓</span> 적합 항목 (${passes.length})
              </button>
              <button id="tab-manual" class="contrast-tab-btn" data-tab="manual">
                <span class="tab-icon manual-icon">⚙</span> 수동 검사
              </button>
            </div>
          </div>
        </div>
        <div id="contrast-tab-content" class="contrast-tab-content">
          <div id="contrast-tab-fail" class="contrast-tab-pane active"></div>
          <div id="contrast-tab-pass" class="contrast-tab-pane"></div>
          <div id="contrast-tab-manual" class="contrast-tab-pane"></div>
        </div>
      `;
      c.appendChild(tabContainer);

      // 탭 이벤트 설정 후에 수동 컬러 피커 도구 추가
      setTimeout(() => {
        // 기존 탭 설정 코드
        const tabButtons = document.querySelectorAll('.contrast-tab-btn');
        tabButtons.forEach(button => {
          button.addEventListener('click', () => {
            // 모든 탭 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.contrast-tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // 클릭된 탭 활성화
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`contrast-tab-${tabId}`).classList.add('active');
          });
        });
        
        // 수동 컬러 피커 도구 추가
        const manualPickerTool = document.createElement('div');
        manualPickerTool.className = 'manual-color-picker-tool';
        manualPickerTool.innerHTML = `
          <div class="color-picker-info">
            <span class="info-text">웹 페이지에서 추출하기 어려운 색상이나 그라디언트, 이미지 등의 배경 위 텍스트 색상 대비를 수동으로 확인할 수 있습니다.</span>
          </div>
          <div class="color-picker-container">
            <div class="color-picker-row">
              <div class="color-input-group">
                <label for="text-color-picker">텍스트 색상:</label>
                <button id="text-color-button" class="color-button">
                  <span class="color-preview-btn" style="background-color:#000000"></span>
                  <input type="color" id="text-color-picker" value="#000000">
                </button>
                <input type="text" id="text-color-hex" value="#000000" placeholder="#000000">
              </div>
              <div class="color-input-group">
                <label for="bg-color-picker">배경 색상:</label>
                <button id="bg-color-button" class="color-button">
                  <span class="color-preview-btn" style="background-color:#FFFFFF"></span>
                  <input type="color" id="bg-color-picker" value="#FFFFFF">
                </button>
                <input type="text" id="bg-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
              </div>
            </div>
            <div class="color-preview-area">
              <div id="manual-color-sample" class="manual-color-sample" style="color: #000000; background-color: #FFFFFF;">
                샘플 텍스트
              </div>
              <div class="manual-contrast-result">
                <div class="contrast-result-text">대비율: <strong id="manual-contrast-ratio">21.00:1</strong> - <span id="manual-contrast-status" class="manual-contrast-status pass">WCAG AA/AAA 통과</span></div>
              </div>
            </div>
          </div>
        `;
        
        const manualPane = document.getElementById('contrast-tab-manual');
        manualPane.appendChild(manualPickerTool);
        
        // 수동 색상 피커 이벤트 설정
        const textColorPicker = document.getElementById('text-color-picker');
        const textColorHex = document.getElementById('text-color-hex');
        const bgColorPicker = document.getElementById('bg-color-picker');
        const bgColorHex = document.getElementById('bg-color-hex');
        const colorSample = document.getElementById('manual-color-sample');
        const contrastRatio = document.getElementById('manual-contrast-ratio');
        const contrastStatus = document.getElementById('manual-contrast-status');
        const textColorBtn = document.getElementById('text-color-button');
        const bgColorBtn = document.getElementById('bg-color-button');
        
        // 색상 버튼 클릭 시 피커 활성화
        textColorBtn.addEventListener('click', () => {
          textColorPicker.click();
        });
        
        bgColorBtn.addEventListener('click', () => {
          bgColorPicker.click();
        });
        
        // 색상 입력값 변경 시 대비율 계산 함수
        function updateManualContrast() {
          try {
            const textColor = parseColor(textColorPicker.value);
            const bgColor = parseColor(bgColorPicker.value);
            const ratio = calculateContrast(textColor, bgColor);
            
            colorSample.style.color = textColorPicker.value;
            colorSample.style.backgroundColor = bgColorPicker.value;
            document.querySelector('#text-color-button .color-preview-btn').style.backgroundColor = textColorPicker.value;
            document.querySelector('#bg-color-button .color-preview-btn').style.backgroundColor = bgColorPicker.value;
            
            contrastRatio.textContent = `${ratio.toFixed(2)}:1`;
            
            // 평가 기준 적용
            if (ratio >= 7) {
              contrastStatus.className = 'manual-contrast-status pass';
              contrastStatus.textContent = 'WCAG AA/AAA 통과';
            } else if (ratio >= 4.5) {
              contrastStatus.className = 'manual-contrast-status pass';
              contrastStatus.textContent = 'WCAG AA 통과 (AAA 실패)';
            } else if (ratio >= 3) {
              contrastStatus.className = 'manual-contrast-status partial';
              contrastStatus.textContent = '큰 텍스트만 WCAG AA 통과';
            } else {
              contrastStatus.className = 'manual-contrast-status fail';
              contrastStatus.textContent = 'WCAG 기준 실패';
            }
          } catch (e) {
            console.error('대비율 계산 오류:', e);
          }
        }
        
        // 색상 입력 필드 이벤트 연결
        textColorPicker.addEventListener('input', () => {
          textColorHex.value = textColorPicker.value.toUpperCase();
          updateManualContrast();
        });
        
        textColorHex.addEventListener('input', () => {
          if (/^#[0-9A-F]{6}$/i.test(textColorHex.value)) {
            textColorPicker.value = textColorHex.value;
            updateManualContrast();
          }
        });
        
        bgColorPicker.addEventListener('input', () => {
          bgColorHex.value = bgColorPicker.value.toUpperCase();
          updateManualContrast();
        });
        
        bgColorHex.addEventListener('input', () => {
          if (/^#[0-9A-F]{6}$/i.test(bgColorHex.value)) {
            bgColorPicker.value = bgColorHex.value;
            updateManualContrast();
          }
        });
        
        // 초기 대비율 계산
        updateManualContrast();
      }, 100);

      // 실패 항목 내용 생성
      const failPane = document.getElementById('contrast-tab-fail');
      if (fails.length) {
        const failItems = document.createElement('div');
        failItems.className = 'contrast-items';
        
        fails.forEach(r => {
          const item = document.createElement('div');
          item.className = 'contrast-item contrast-fail';
          
          // 기준에 대한 설명 툴팁 추가
          const criteriaText = r.fs >= 18 || (r.fs >= 14 && parseInt(r.fw) >= 700) ? 
            '큰 텍스트 (3:1)' : '일반 텍스트 (4.5:1)';
          
          item.innerHTML = `
            <div class="item-header">
              <span class="label label-fail">실패</span>
              <span class="item-text">"${r.text}"</span>
            </div>
            <div class="item-details">
              <div class="contrast-info-row">
                <div class="color-sample-box" style="color: ${r.textColorHex}; background-color: ${r.bgColorHex}">Abc</div>
                <div class="contrast-ratio">
                  <div class="ratio-value low-ratio">${criteriaText} - 대비율: <strong>${r.contrast.toFixed(2)}:1</strong></div>
                  <div class="color-info">
                    <span class="color-chip">
                      <span class="color-preview" style="background-color:${r.textColorHex}"></span>
                      <span class="color-code">${r.textColorHex}</span>
                    </span>
                    <span class="color-chip">
                      <span class="color-preview" style="background-color:${r.bgColorHex}"></span>
                      <span class="color-code">${r.bgColorHex}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="element-code-preview">
                <button class="code-toggle">코드 보기</button>
                <div class="code-content">
                  <code class="element-html">텍스트 요소: ${escapeHTML(r.elementHTML)}</code>
                  ${r.bgElementHTML ? `<code class="bg-element-html">배경 요소: ${escapeHTML(r.bgElementHTML)}</code>` : ''}
                </div>
              </div>
            </div>
          `;
          
          item.onclick = (e) => {
            // 코드 토글 버튼 클릭 시 이벤트 처리
            if (e.target.classList.contains('code-toggle') || e.target.closest('.code-toggle')) {
              const toggleBtn = e.target.classList.contains('code-toggle') ? e.target : e.target.closest('.code-toggle');
              const codeContent = toggleBtn.nextElementSibling;
              codeContent.classList.toggle('show');
              toggleBtn.classList.toggle('active');
              toggleBtn.textContent = codeContent.classList.contains('show') ? '코드 접기' : '코드 보기';
              e.stopPropagation();
              return;
            }
            
            // 코드 영역 클릭 시 이벤트 전파 중지
            if (e.target.closest('.code-content')) {
              e.stopPropagation();
              return;
            }
            
            removeHighlights();
            r.el.classList.add('item-highlight');
            r.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          };
          
          failItems.appendChild(item);
        });
        
        failPane.appendChild(failItems);
      } else {
        failPane.innerHTML = '<div class="empty-message">부적합 항목이 없습니다.</div>';
      }
  
      // 통과 항목 내용 생성
      const passPane = document.getElementById('contrast-tab-pass');
      if (passes.length) {
        const passItems = document.createElement('div');
        passItems.className = 'contrast-items';
        
        passes.forEach(r => {
          const item = document.createElement('div');
          item.className = 'contrast-item contrast-pass';
          
          const labels = [];
          if (r.aa) labels.push(`<span class="label label-aa" title="WCAG 2.0 AA 기준 통과">AA</span>`);
          if (r.aaa) labels.push(`<span class="label label-aaa" title="WCAG 2.0 AAA 기준 통과">AAA</span>`);
          
          // 기준에 대한 설명 툴팁 추가
          const criteriaText = r.fs >= 18 || (r.fs >= 14 && parseInt(r.fw) >= 700) ? 
            '큰 텍스트 (3:1)' : '일반 텍스트 (4.5:1)';
          
          item.innerHTML = `
            <div class="item-header">
              ${labels.join(' ')}
              <span class="item-text">"${r.text}"</span>
            </div>
            <div class="item-details">
              <div class="contrast-info-row">
                <div class="color-sample-box" style="color: ${r.textColorHex}; background-color: ${r.bgColorHex}">Abc</div>
                <div class="contrast-ratio">
                  <div class="ratio-value high-ratio">${criteriaText} - 대비율: <strong>${r.contrast.toFixed(2)}:1</strong></div>
                  <div class="color-info">
                    <span class="color-chip">
                      <span class="color-preview" style="background-color:${r.textColorHex}"></span>
                      <span class="color-code">${r.textColorHex}</span>
                    </span>
                    <span class="color-chip">
                      <span class="color-preview" style="background-color:${r.bgColorHex}"></span>
                      <span class="color-code">${r.bgColorHex}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="element-code-preview">
                <button class="code-toggle">코드 보기</button>
                <div class="code-content">
                  <code class="element-html">텍스트 요소: ${escapeHTML(r.elementHTML)}</code>
                  ${r.bgElementHTML ? `<code class="bg-element-html">배경 요소: ${escapeHTML(r.bgElementHTML)}</code>` : ''}
                </div>
              </div>
            </div>
          `;
          
          item.onclick = (e) => {
            // 코드 토글 버튼 클릭 시 이벤트 처리
            if (e.target.classList.contains('code-toggle') || e.target.closest('.code-toggle')) {
              const toggleBtn = e.target.classList.contains('code-toggle') ? e.target : e.target.closest('.code-toggle');
              const codeContent = toggleBtn.nextElementSibling;
              codeContent.classList.toggle('show');
              toggleBtn.classList.toggle('active');
              toggleBtn.textContent = codeContent.classList.contains('show') ? '코드 접기' : '코드 보기';
              e.stopPropagation();
              return;
            }
            
            // 코드 영역 클릭 시 이벤트 전파 중지
            if (e.target.closest('.code-content')) {
              e.stopPropagation();
              return;
            }
            
            removeHighlights();
            r.el.classList.add('item-highlight');
            r.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          };
          
          passItems.appendChild(item);
        });
        
        passPane.appendChild(passItems);
      } else {
        passPane.innerHTML = '<div class="empty-message">적합 항목이 없습니다.</div>';
      }

      // HTML 문자열 이스케이프 함수
      function escapeHTML(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // CSS 스타일 추가
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .contrast-guide {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 10px;
          margin: 0 12px 12px 12px;
          border-left: 3px solid #4285f4;
        }
        
        .contrast-guide-header {
          display: flex;
          align-items: center;
          position: relative;
        }
        
        .contrast-guide-header h3 {
          margin: 0;
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        
        .info-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4285f4;
          color: white;
          font-size: 11px;
          margin-left: 6px;
          cursor: pointer;
        }
        
        .contrast-tooltip {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border: 1px solid #ddd;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-radius: 6px;
          padding: 10px;
          z-index: 1000;
          width: 300px;
          margin-top: 8px;
        }
        
        .tooltip-content h4 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .tooltip-content p {
          margin: 6px 0;
          font-size: 13px;
          line-height: 1.4;
        }
        
        /* 요약 정보 간소화 */
        .contrast-summary {
          background-color: white;
          border-radius: 8px;
          padding: 10px;
          margin: 0 12px 12px 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .contrast-summary-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .summary-stats {
          font-size: 13px;
        }
        
        .summary-stats p {
          margin: 0;
        }
        
        .progress-container {
          width: 100%;
        }
        
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }
        
        .pass-dot {
          background-color: #34a853;
        }
        
        .fail-dot {
          background-color: #ea4335;
        }
        
        .pass-stat {
          color: #34a853;
        }
        
        .fail-stat {
          color: #ea4335;
        }
        
        .progress-bar {
          height: 6px;
          background-color: #f2f2f2;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar-fill {
          height: 100%;
          background-color: #34a853;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        /* 탭 스타일 개선 */
        .contrast-tabs {
          margin: 0 12px;
        }
        
        .contrast-tab-header {
          margin-bottom: 10px;
        }
        
        .contrast-tab-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        
        .tab-buttons {
          display: flex;
          gap: 4px;
        }
        
        .contrast-tab-btn {
          padding: 8px 12px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          color: #666;
          transition: all 0.2s;
        }
        
        .contrast-tab-btn:hover {
          background-color: #f5f5f5;
        }
        
        .contrast-tab-btn.active {
          border-bottom-color: #4285f4;
          color: #4285f4;
        }
        
        .tab-icon {
          margin-right: 6px;
        }
        
        .fail-icon {
          color: #ea4335;
        }
        
        .pass-icon {
          color: #34a853;
        }
        
        .manual-icon {
          color: #4285f4;
        }
        
        .contrast-tab-pane {
          display: none;
        }
        
        .contrast-tab-pane.active {
          display: block;
        }
        
        /* 카드 아이템 스타일 */
        .contrast-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
          padding-bottom: 16px;
        }
        
        .contrast-item {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          overflow: hidden;
          border: 1px solid #eee;
          transition: all 0.2s;
        }
        
        .contrast-item:hover {
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .item-header {
          padding: 10px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        
        .item-text {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .item-details {
          padding: 10px;
        }
        
        .contrast-info-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .color-sample-box {
          width: 55px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid #eee;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          flex-shrink: 0;
          text-align: center;
        }
        
        .contrast-ratio {
          flex: 1;
          text-align: left;
        }
        
        .ratio-value {
          font-size: 13px;
          margin-bottom: 5px;
          text-align: left;
        }
        
        .low-ratio {
          color: #ea4335;
        }
        
        .high-ratio {
          color: #34a853;
        }
        
        .color-info {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          text-align: left;
        }
        
        .color-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 6px;
          background-color: #f8f9fa;
          border: 1px solid #eee;
          border-radius: 4px;
          font-size: 11px;
          text-align: left;
        }
        
        .color-preview {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .color-code {
          font-family: monospace;
          color: #444;
          text-align: left;
        }
        
        .element-code-preview {
          margin-top: 8px;
          border-top: 1px solid #eee;
          padding-top: 8px;
          text-align: left;
        }
        
        .code-toggle {
          font-size: 12px;
          color: #4285f4;
          cursor: pointer;
          padding: 3px 6px;
          background: none;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
          margin: 0;
          text-align: left;
        }
        
        .code-toggle:hover {
          color: #2b71d9;
          background-color: #f5f5f5;
        }
        
        .code-toggle::before {
          content: '▶';
          font-size: 9px;
          transition: transform 0.2s ease;
        }
        
        .code-toggle.active::before {
          transform: rotate(90deg);
        }
        
        .code-content {
          display: none;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-top: 6px;
          overflow: hidden;
        }
        
        .code-content.show {
          display: block;
        }
        
        .element-html, .bg-element-html {
          display: block;
          font-family: monospace;
          font-size: 11px;
          padding: 8px;
          overflow-x: auto;
          white-space: pre-wrap;
          color: #444;
          line-height: 1.4;
          text-align: left;
        }
        
        .bg-element-html {
          border-top: 1px dashed #ddd;
          background-color: #f1f3f5;
        }
        
        .label {
          display: inline-flex;
          align-items: center;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          line-height: 1;
        }
        
        .label-fail {
          background-color: #ffebee;
          color: #d32f2f;
        }
        
        .label-aa {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .label-aaa {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        .empty-message {
          text-align: center;
          padding: 20px;
          color: #888;
          font-style: italic;
          background-color: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        /* 수동 검사 도구 */
        .manual-color-picker-tool {
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          margin-bottom: 16px;
        }
        
        .color-picker-info {
          margin-bottom: 16px;
        }
        
        .info-text {
          font-size: 13px;
          color: #666;
        }
        
        .color-picker-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .color-picker-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .color-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .color-input-group label {
          font-size: 13px;
          font-weight: 500;
        }
        
        .color-button {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 4px;
          border: 1px solid #ddd;
          overflow: hidden;
          padding: 0;
          cursor: pointer;
          background: none;
        }
        
        .color-preview-btn {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        input[type="color"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        input[type="text"] {
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
          width: 80px;
        }
        
        .color-preview-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .manual-color-sample {
          padding: 16px;
          text-align: center;
          font-size: 16px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid #eee;
        }
        
        .manual-contrast-result {
          background-color: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .contrast-result-text {
          font-size: 14px;
        }
        
        .manual-contrast-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          margin-left: 4px;
          font-size: 12px;
        }
        
        .manual-contrast-status.pass {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .manual-contrast-status.partial {
          background-color: #fff8e1;
          color: #ff8f00;
        }
        
        .manual-contrast-status.fail {
          background-color: #ffebee;
          color: #d32f2f;
        }
        
        /* 강조 효과 */
        .item-highlight {
          outline: 3px solid #4285f4 !important;
          outline-offset: 2px !important;
        }
      `;
      c.appendChild(styleEl);
    }
  
    function analyzeWCAG() {
      const wcagContent = document.getElementById('tab-content-wcag');
      wcagContent.innerHTML = '<div class="loading">접근성 분석 중...</div>';
      
      // axe-core를 사용한 WCAG 분석 수행
      loadAxeCore()
        .then(axe => {
          return axe.run(document, {
            resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'],
            selectors: true
          });
        })
        .then(results => {
          wcagContent.innerHTML = '';
          
          // 각 WCAG 카테고리별로 검사 결과 표시
          for (const [key, category] of Object.entries(KWCAG22)) {
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';
            categorySection.innerHTML = `<h3>${category.name}</h3>`;
            
            category.items.forEach(item => {
              // axe 결과에서 관련 규칙 찾기
              let result = analyzeWCAGItem(item);
              
              // axe-core의 결과와 통합
              const axeRules = mapWCAGToAxeRules(item.id);
              if (axeRules.length > 0) {
                const axeResults = getAxeResultsForRules(results, axeRules);
                if (axeResults.status !== 'inapplicable') {
                  result = axeResults;
                }
              }
              
              const itemDiv = document.createElement('div');
              itemDiv.className = `guideline-item ${result.status}`;
              itemDiv.setAttribute('data-guideline', item.id);
              itemDiv.setAttribute('data-category', key);
              
              let statusText = '';
              if (result.status === 'pass') {
                statusText = '✓ 양호: ';
              } else if (result.status === 'fail') {
                statusText = '✗ 문제점: ';
              } else if (result.status === 'review') {
                statusText = '? 검토 필요: ';
              }
              
              itemDiv.innerHTML = `
                <h4>${item.id} ${item.name}</h4>
                <p>${item.desc}</p>
                <p>${statusText}${result.message}</p>
              `;
              
              // 위반 요소가 있는 경우 강조 추가
              if (result.elements && result.elements.length > 0) {
                const showElementBtn = document.createElement('button');
                showElementBtn.className = 'show-element-btn';
                showElementBtn.textContent = '위반 요소 보기';
                showElementBtn.addEventListener('click', () => {
                  removeHighlights();
                  result.elements.forEach(el => {
                    try {
                      el.classList.add('item-highlight');
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch (e) {
                      console.error('요소 강조 표시 오류:', e);
                    }
                  });
                });
                itemDiv.appendChild(showElementBtn);
              }
              
              categorySection.appendChild(itemDiv);
            });
            
            wcagContent.appendChild(categorySection);
          }
        })
        .catch(error => {
          console.error('WCAG 분석 오류:', error);
          wcagContent.innerHTML = '<div class="error">접근성 분석 중 오류가 발생했습니다.</div>';
        });
    }

    // WCAG 규칙과 axe-core 규칙 매핑
    function mapWCAGToAxeRules(wcagId) {
      // WCAG 기준과 axe-core 규칙 간의 매핑 정의
      const wcagToAxeMap = {
        '1.1.1': ['image-alt', 'input-image-alt', 'area-alt', 'svg-img-alt'],
        '1.2.1': ['audio-caption', 'video-caption'],
        '1.3.1': ['table-fake-caption', 'td-has-header', 'th-has-data-cells'],
        '1.3.2': ['logical-tab-order', 'heading-order'],
        '1.3.3': ['label', 'input-button-name', 'form-field-multiple-labels'],
        '1.4.1': ['link-in-text-block', 'color-contrast'],
        '1.4.3': ['color-contrast'],
        '2.1.1': ['accesskeys', 'focusable-no-name', 'area-alt'],
        '2.4.1': ['bypass', 'region'],
        '2.4.2': ['document-title', 'frame-title'],
        '2.4.3': ['link-name', 'button-name'],
        '3.1.1': ['html-lang-valid', 'html-has-lang'],
        '3.3.1': ['aria-input-field-name', 'label'],
        '3.3.2': ['label', 'input-button-name'],
        '4.1.1': ['duplicate-id-active', 'duplicate-id'],
        '4.1.2': ['aria-roles', 'aria-valid-attr', 'aria-required-attr']
      };
      
      return wcagToAxeMap[wcagId] || [];
    }

    // axe-core 결과에서 특정 규칙에 대한 결과 추출
    function getAxeResultsForRules(axeResults, ruleIds) {
      const violations = axeResults.violations.filter(v => ruleIds.includes(v.id));
      const incomplete = axeResults.incomplete.filter(v => ruleIds.includes(v.id));
      const passes = axeResults.passes.filter(v => ruleIds.includes(v.id));
      
      if (violations.length > 0) {
        // 가장 심각한 위반 항목 선택
        const mostSevere = violations.sort((a, b) => {
          const impactOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        })[0];
        
        return {
          status: 'fail',
          message: `${mostSevere.help} (${mostSevere.nodes.length}개 요소)`,
          elements: mostSevere.nodes.slice(0, 3).map(node => {
            try {
              const selector = node.target[0];
              return document.querySelector(selector);
            } catch (e) {
              return null;
            }
          }).filter(Boolean)
        };
      } 
      
      if (incomplete.length > 0) {
        return {
          status: 'review',
          message: `수동 검토 필요: ${incomplete[0].help}`,
          elements: []
        };
      }
      
      if (passes.length > 0) {
        return {
          status: 'pass',
          message: `검사 통과 (${passes.reduce((total, rule) => total + rule.nodes.length, 0)}개 요소)`,
          elements: []
        };
      }
      
      return {
        status: 'inapplicable',
        message: '해당 없음',
        elements: []
      };
    }
  
    function analyzeForUDL() {
      const udlContent = document.getElementById('tab-content-udl');
      udlContent.innerHTML = '<div class="loading">AI 분석 중...</div>';
      
      // 페이지의 HTML 구조를 기반으로 분석
      const pageHtml = document.documentElement.outerHTML;
      const pageTitle = document.title || 'Untitled Page';
      const bodyText = document.body.innerText;
      
      // AI를 통한 분석 및 제안
      analyzeUDLWithAI(pageHtml, pageTitle, bodyText);
    }
  
    function analyzeUDLWithAI(html, title, bodyText) {
      const udlContent = document.getElementById('tab-content-udl');
      
      // 페이지 콘텐츠 요약 생성
      const pageContentSummary = `
        페이지 제목: ${title}
        페이지 콘텐츠 요약: ${bodyText.slice(0, 1000)}...
      `.trim();
      
      // API 요청 데이터 준비
      const requestData = {
        contents: [{
          parts: [{
            text: `웹 페이지를 UDL(보편적 학습 설계) 원칙과 웹 접근성에 따라 분석해주세요. 
             
다음은 분석할 웹 페이지의 정보입니다:
${pageContentSummary}

이 페이지의 접근성을 개선하기 위한 방안을 구체적으로 5-7가지 제안해주세요.
특히 다음에 초점을 맞춰주세요:
1. 시각적 접근성 (색상 대비, 텍스트 크기, 레이아웃)
2. 키보드 접근성
3. 화면 읽기 프로그램 대응
4. 명확한 네비게이션 구조
5. 다양한 사용자를 위한 멀티미디어 대안

현재 페이지에서 개선이 필요한 부분을 지적하고, 어떻게 개선할 수 있는지 실용적인 방법을 제시해주세요.
마크다운 형식으로 응답해주세요.`
          }]
        }]
      };
      
      // Gemini API 호출
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        loadingDiv = udlContent.querySelector('.loading');
        if (loadingDiv) {
          loadingDiv.remove();
        }
        
        // 결과 표시 영역 생성
        const resultDiv = document.createElement('div');
        resultDiv.className = 'ai-analysis-result';
        
        // AI 응답 결과 처리
        try {
          const aiText = data.candidates[0].content.parts[0].text;
          resultDiv.innerHTML = `
            <div class="ai-response">
              ${formatAIResponse(aiText)}
            </div>
          `;
        } catch (e) {
          resultDiv.innerHTML = `
            <div class="error">
              <p>AI 응답 처리 중 오류가 발생했습니다: ${e.message}</p>
            </div>
          `;
        }
        
        udlContent.appendChild(resultDiv);
      })
      .catch(error => {
        loadingDiv = udlContent.querySelector('.loading');
        if (loadingDiv) {
          loadingDiv.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `
          <p>죄송합니다. AI 분석 중 오류가 발생했습니다.</p>
          <p>오류 내용: ${error.message}</p>
          <p>API 엔드포인트: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent</p>
        `;
        udlContent.appendChild(errorDiv);
      });
    }
  
    function formatAIResponse(text) {
      // 마크다운 변환 개선
      let formattedText = text
        // 헤더 처리
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // 코드 블록 처리
        .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
        
        // 인라인 코드 처리
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        
        // 굵게 처리
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        
        // 기울임꼴 처리
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        
        // 구분선 처리
        .replace(/^---$/gm, '<hr>')
        
        // 링크 처리
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      // 목록 항목 처리 - HTML로 변환
      const listItemRegex = /^(\s*)[-*+] (.*)$/gm;
      const listItemMatches = [...formattedText.matchAll(listItemRegex)];
      
      if (listItemMatches.length > 0) {
        // 목록 항목 변환
        formattedText = formattedText.replace(listItemRegex, '<li>$2</li>');
        
        // 목록 항목을 ul 태그로 감싸기
        formattedText = '<ul>' + formattedText + '</ul>';
        
        // 중첩된 목록 태그 제거
        formattedText = formattedText.replace(/<\/ul>\s*<ul>/g, '');
      }
      
      // 문단 처리 - 빈 줄을 기준으로 문단 분리
      formattedText = formattedText.replace(/\n\n/g, '</p><p>');
      
      // 최종 결과를 div로 감싸기
      const styledResponse = `
        <div class="ai-analysis-content">
          <p>${formattedText}</p>
          <style>
            .ai-analysis-content {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 16px;
              background-color: #fff;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .ai-analysis-content h1, 
            .ai-analysis-content h2, 
            .ai-analysis-content h3 {
              margin-top: 24px;
              margin-bottom: 16px;
              color: #1a73e8;
              font-weight: 600;
              line-height: 1.3;
            }
            
            .ai-analysis-content h1 {
              font-size: 24px;
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
            }
            
            .ai-analysis-content h2 {
              font-size: 20px;
            }
            
            .ai-analysis-content h3 {
              font-size: 16px;
            }
            
            .ai-analysis-content p {
              margin-bottom: 16px;
            }
            
            .ai-analysis-content ul, 
            .ai-analysis-content ol {
              margin-bottom: 16px;
              padding-left: 24px;
            }
            
            .ai-analysis-content li {
              margin-bottom: 8px;
              list-style-type: disc;
            }
            
            .ai-analysis-content code.inline-code {
              background-color: #f5f7fa;
              padding: 2px 4px;
              border-radius: 4px;
              font-family: Consolas, Monaco, 'Andale Mono', monospace;
              font-size: 90%;
              color: #e53935;
            }
            
            .ai-analysis-content pre.code-block {
              background-color: #f5f7fa;
              padding: 16px;
              border-radius: 4px;
              overflow-x: auto;
              font-family: Consolas, Monaco, 'Andale Mono', monospace;
              font-size: 90%;
              color: #333;
              border: 1px solid #eee;
              margin-bottom: 16px;
              white-space: pre-wrap;
            }
            
            .ai-analysis-content hr {
              border: 0;
              height: 1px;
              background-color: #eee;
              margin: 24px 0;
            }
            
            .ai-analysis-content strong {
              font-weight: 600;
            }
            
            .ai-analysis-content a {
              color: #1a73e8;
              text-decoration: none;
            }
            
            .ai-analysis-content a:hover {
              text-decoration: underline;
            }
            
            .ai-analysis-content em {
              font-style: italic;
              color: #555;
            }
          </style>
        </div>
      `;
      
      return styledResponse;
    }
  
    function initChat() {
      if (!document.querySelector('.chat-messages')) return;
      
      const chatInput = document.getElementById('chat-input-field');
      const chatSendBtn = document.getElementById('chat-send-btn');
      const chatMessages = document.querySelector('.chat-messages');
      const resetChatBtn = document.getElementById('reset-chat-btn');
      
      console.log('채팅 초기화:', {chatInput, chatSendBtn, chatMessages, resetChatBtn});
      
      // 채팅 창 스크롤 최적화 - 채팅 탭 클릭 시에도 적용
      document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', () => {
          if (tab.getAttribute('data-tab') === 'tab-content-chat') {
            // 채팅 탭이 활성화되면 스크롤 처리
            setTimeout(() => scrollToBottom(chatMessages), 100);
          }
        });
      });
      
      // 이미 초기화된 경우 건너뛰기
      if (chatInput && chatSendBtn && chatMessages.children.length === 0) {
        // 대화 기록 초기화
        window.chatHistory = [];
        
        // 초기 인사 메시지 추가 (다시 활성화)
        addBotMessage("안녕하세요! UDL 및 웹 접근성 관련 질문이 있으시면 편하게 물어보세요.");
        
        // 대화 내용 다운로드 버튼 이벤트 리스너
        const downloadChatBtn = document.getElementById('download-chat-btn');
        if (downloadChatBtn) {
          downloadChatBtn.addEventListener('click', downloadChat);
        }
        
        // 대화 초기화 버튼 이벤트 리스너
        if (resetChatBtn) {
          resetChatBtn.addEventListener('click', resetChat);
        }
        
        // 이벤트 리스너 추가
        chatSendBtn.addEventListener('click', function() {
          console.log('전송 버튼 클릭됨');
          sendChatMessage();
        });
        
        chatInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            console.log('엔터키 입력됨');
            sendChatMessage();
          }
        });
        
        // 스크롤 이벤트 리스너 추가 - 여러 방법으로 스크롤 이벤트 확인
        chatMessages.addEventListener('DOMNodeInserted', () => {
          // 콘텐츠가 추가될 때마다 스크롤 처리
          setTimeout(() => scrollToBottom(chatMessages), 10);
        });
        
        // 채팅 창 내부 요소 변경 감지 (MutationObserver)
        const observer = new MutationObserver(() => {
          setTimeout(() => scrollToBottom(chatMessages), 10);
        });
        
        // 채팅창 DOM 변경 감지 설정
        observer.observe(chatMessages, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          characterData: true 
        });
        
        // 초기 스크롤 위치 조정
        setTimeout(() => scrollToBottom(chatMessages), 100);
        setTimeout(() => scrollToBottom(chatMessages), 500);
        setTimeout(() => scrollToBottom(chatMessages), 1000);
        
        // 레이아웃 재계산을 위한 스타일 적용
        const applyScrollFix = () => {
          chatMessages.style.display = 'none';
          // 강제로 레이아웃 재계산을 트리거
          void chatMessages.offsetHeight;
          chatMessages.style.display = 'flex';
          scrollToBottom(chatMessages);
        };
        
        // 윈도우 크기 변경 시 스크롤 조정
        window.addEventListener('resize', applyScrollFix);
        
        // 채팅창 클릭 시 스크롤 조정 (사용자 상호작용 후)
        chatMessages.addEventListener('click', () => scrollToBottom(chatMessages));
        
        console.log('채팅 이벤트 설정 완료');
      } else if (chatMessages.children.length > 0) {
        // 이미 메시지가 있는 경우 스크롤
        scrollToBottom(chatMessages);
      }
    }
    
    function resetChat() {
      if (!confirm('현재 대화 내용을 지우고 새 대화를 시작하시겠습니까?')) return;
      
      // 대화 기록 초기화
      window.chatHistory = [];
      
      // 채팅 메시지 영역 비우기
      const chatMessages = document.querySelector('.chat-messages');
      chatMessages.innerHTML = '';
      
      // 초기 메시지 추가 (다시 활성화)
      addBotMessage("안녕하세요! UDL 및 웹 접근성 관련 질문이 있으시면 편하게 물어보세요.");
    }
    
    function downloadChat() {
      if (!window.chatHistory || window.chatHistory.length === 0) {
        alert('다운로드할 대화 내용이 없습니다.');
        return;
      }
      
      // 대화 내용을 텍스트로 변환
      const chatText = window.chatHistory.map(item => {
        return `${item.role === 'user' ? '사용자' : 'AI'}: ${item.content}`;
      }).join('\n\n');
      
      // 현재 날짜와 시간으로 파일명 생성
      const date = new Date();
      const fileName = `UDL-Chat-${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.txt`;
      
      // 다운로드 링크 생성 및 클릭
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(chatText));
      element.setAttribute('download', fileName);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  
    // PDF 데이터 캐시 변수
    let cachedPDFData = null;

    function loadKnowledgePDF() {
      // 이미 캐시된 데이터가 있으면 바로 반환
      if (cachedPDFData) {
        return Promise.resolve(cachedPDFData);
      }
      
      // 최초 1회만 PDF 로드 - CORS 우회를 위해 fetch 대신 XMLHttpRequest 사용
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://raw.githubusercontent.com/suhmieum/UDL/main/%ED%95%9C%EA%B5%AD%ED%98%95%20%EC%9B%B9%20%EC%BD%98%ED%85%90%EC%B8%A0%20%EC%A0%91%EA%B7%BC%EC%84%B1%20%EC%A7%80%EC%B9%A8%202.2-2.pdf', true);
        xhr.responseType = 'arraybuffer';
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            const buffer = xhr.response;
            cachedPDFData = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            resolve(cachedPDFData);
          } else {
            reject(new Error('PDF 파일을 불러올 수 없습니다.'));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('PDF 파일을 불러오는 중 오류가 발생했습니다.'));
        };
        
        xhr.send();
      }).catch(error => {
        console.error('PDF 로드 오류:', error);
        return null;
      });
    }

    function sendChatMessage() {
      console.log('sendChatMessage 함수 실행됨');
      
      const chatInput = document.getElementById('chat-input-field');
      const chatMessages = document.querySelector('.chat-messages');
      const userMessage = chatInput.value.trim();
      
      console.log('사용자 입력:', userMessage);
      
      if (!userMessage) {
        console.log('입력이 비어있음, 함수 종료');
        return;
      }
      
      // 웹 접근성과 무관한 질문인지 확인
      const accessibilityKeywords = [
        '접근성', '웹접근성', 'KWCAG', '대체텍스트', '키보드', '스크린리더', '명도', '대비', 
        '색상', '자막', '표', '구조', '레이아웃', '마크업', 'ARIA', '지침', '인식', '이해', 
        '운용', '콘텐츠', '대체', '텍스트', '이미지', '링크', '버튼', '서식', '오류', 'alt', 
        'label', 'WAI', 'WCAG', '장애', '시각', '청각', '인지', '마우스', '포커스', '네비게이션'
      ];
      
      const isAccessibilityRelated = accessibilityKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (!isAccessibilityRelated && userMessage.length > 10) {
        // 접근성 관련 키워드가 없고 10자 이상인 경우
        addUserMessage(userMessage);
        chatInput.value = '';
        
        // 관련 없는 질문 응답
        addBotMessage("CP님, 죄송합니다만 이 도구는 웹 접근성 관련 질문에 특화되어 있습니다. KWCAG 2.2(한국형 웹 콘텐츠 접근성 지침)에 관한 질문이나 현재 페이지의 접근성 개선 방안에 대해 문의해 주시기 바랍니다.");
        return;
      }
      
      // 사용자 메시지 추가
      addUserMessage(userMessage);
      chatInput.value = '';
      
      // 대화 기록에 추가
      if (!window.chatHistory) window.chatHistory = [];
      window.chatHistory.push({ role: 'user', content: userMessage });
      
      // 최대 5개 메시지만 기억
      if (window.chatHistory.length > 10) {
        window.chatHistory = window.chatHistory.slice(window.chatHistory.length - 10);
      }
      
      // 로딩 표시
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      chatMessages.appendChild(loadingDiv);
      
      // 스크롤 처리 개선 - 통합 함수 사용
      scrollToBottom(chatMessages);

      console.log('API 요청 준비 중');
      
      // 극도로 간단한 프롬프트 작성
      const promptText = `
웹 접근성 전문가로서 아래 질문에 답변해주세요:

페이지 정보: ${document.title} (${window.location.href})

사용자 질문: ${userMessage}

웹 접근성 관련 질문에 대해 한국형 웹 콘텐츠 접근성 지침(KWCAG) 2.2를 기준으로 답변해주세요.
답변 시 다음 형식을 사용하세요:

---
**[관련 KWCAG 항목]**
* **오류:**
* **문제점:**
* **해결방법:**
* **코드 예시:** (필요 시)
---

사용자는 "CP님"으로 호칭하고, 간결하게 답변해주세요.
      `.trim();

      const requestData = {
        contents: [{ parts: [{ text: promptText }] }]
      };
      
      console.log('API 요청 시작, 프롬프트 길이:', promptText.length);
      
      // 20초 타임아웃 (더 짧게 설정)
      const timeoutId = setTimeout(() => {
        console.error('API 호출 타임아웃');
        loadingDiv.remove();
        
        // 단순 메시지 대신 즉시 기본 응답 제공
        const fallbackResponse = `
CP님, 현재 AI 응답 생성에 문제가 발생했습니다. 

자동 생성된 접근성 점검 결과는 다음과 같습니다:
- 키보드 접근성 확인이 필요합니다.
- 대체 텍스트 제공 여부를 확인해보세요.
- 색상 대비가 충분한지 확인하세요.

더 자세한 분석을 위해 질문을 간결하게 다시 작성해주시거나, 나중에 다시 시도해보세요.
        `;
        
        addBotMessage(fallbackResponse);
      }, 20000);
      
      // 에러 카운터 추가
      if (!window.apiErrorCount) window.apiErrorCount = 0;
      
      // 이전 API 요청 실패 여부 확인
      if (window.apiErrorCount > 2) {
        clearTimeout(timeoutId);
        loadingDiv.remove();
        
        // 3번 이상 실패 시 즉시 폴백 응답
        const fallbackResponse = `
CP님, API 서비스에 일시적인 문제가 발생했습니다.
나중에 다시 시도해주세요.
        `;
        
        addBotMessage(fallbackResponse);
        return;
      }
      
      // API 호출
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          window.apiErrorCount++; // 에러 카운트 증가
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        window.apiErrorCount = 0; // 성공 시 에러 카운트 초기화
        return response.json();
      })
      .then(data => {
        loadingDiv.remove();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
          const aiResponse = data.candidates[0].content.parts[0].text;
          addBotMessage(aiResponse);
        } else {
          window.apiErrorCount++; // 잘못된 응답 구조도 에러로 간주
          console.error('API 응답 구조 문제:', data);
          addBotMessage("죄송합니다. 응답 생성에 문제가 발생했습니다. 다시 시도해주세요.");
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
        loadingDiv.remove();
        window.apiErrorCount++; // 에러 카운트 증가
        console.error('API 호출 오류:', error);
        
        // 에러 메시지를 간결하게 표시
        addBotMessage(`죄송합니다. API 서비스 연결에 문제가 발생했습니다.`);
      });
    }
  
    function addUserMessage(message) {
      const chatMessages = document.querySelector('.chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message chat-user';
      messageDiv.textContent = message;
      chatMessages.appendChild(messageDiv);
      
      // 맨 아래로 스크롤 - 통합 함수 사용
      scrollToBottom(chatMessages);
      
      // 추가 스크롤 처리
      setTimeout(() => scrollToBottom(chatMessages), 100);
      
      // 스크롤이 제대로 되지 않을 경우를 위한 보호 장치
      setTimeout(() => {
        const isAtBottom = chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop < 30;
        if (!isAtBottom) {
          console.log('사용자 메시지 스크롤 강제 조정');
          scrollToBottom(chatMessages);
        }
      }, 300);
    }
  
    function addBotMessage(message) {
      const chatMessages = document.querySelector('.chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message chat-bot';
      messageDiv.innerHTML = formatAIResponse(message);
      
      // 현재 채팅 창의 스크롤 상태 확인
      const wasAtBottom = chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop < 30;
      
      // 메시지 추가
      chatMessages.appendChild(messageDiv);
      
      // 스크롤 강제 처리 (현재 스크롤 상태와 무관하게 항상 맨 아래로)
      scrollToBottom(chatMessages);
      
      // 이미지와 스타일이 로드된 후 추가 스크롤 처리
      const allImages = messageDiv.querySelectorAll('img');
      if (allImages.length > 0) {
        // 이미지가 있는 경우 이미지 로드 완료 후 스크롤
        allImages.forEach(img => {
          img.onload = () => scrollToBottom(chatMessages);
        });
      }
      
      // 메시지에 포함된 이미지 로드 완료 후 추가 스크롤
      setTimeout(() => scrollToBottom(chatMessages), 100);
      setTimeout(() => scrollToBottom(chatMessages), 500);
      setTimeout(() => scrollToBottom(chatMessages), 1000);
      
      // 웹 페이지가 완전히 로드된 이후 추가 스크롤
      window.addEventListener('load', () => scrollToBottom(chatMessages));
      
      // 스크롤이 제대로 되지 않을 경우를 위한 마지막 보호 장치
      (function ensureScroll(count = 0) {
        if (count > 10) return; // 최대 10번 시도
        
        setTimeout(() => {
          scrollToBottom(chatMessages);
          
          // 스크롤이 제대로 되었는지 확인
          const isAtBottom = chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop < 30;
          if (!isAtBottom) {
            // 스크롤이 맨 아래가 아니면 다시 시도
            ensureScroll(count + 1);
          }
        }, 300 * (count + 1)); // 점점 지연 시간 증가
      })();
      
      // 대화 기록에 추가
      if (!window.chatHistory) window.chatHistory = [];
      window.chatHistory.push({ role: 'bot', content: message });
      
      // 최대 5개 메시지만 기억
      if (window.chatHistory.length > 10) {
        window.chatHistory = window.chatHistory.slice(window.chatHistory.length - 10);
      }
      
      // 채팅 영역 스크롤 이벤트 처리
      chatMessages.onscroll = function() {
        // 스크롤 상태 확인
        const isNearBottom = chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop < 30;
        console.log('스크롤 상태:', isNearBottom ? '맨 아래' : '스크롤 중');
      };
    }
  
    function runFullScan() {
      // 로딩 메시지 표시
      const statusDiv = document.createElement('div');
      statusDiv.className = 'alert-message';
      statusDiv.textContent = 'axe-core를 이용한 전체 검사를 시작합니다...';
      document.body.appendChild(statusDiv);
      
      // axe-core를 사용한 전체 분석 수행
      loadAxeCore()
        .then(axe => {
          statusDiv.textContent = 'axe-core 분석 중...';
          return axe.run(document, {
            resultTypes: ['violations', 'incomplete', 'passes', 'inapplicable'],
            selectors: true
          });
        })
        .then(results => {
          statusDiv.textContent = '색상 대비 분석 중...';
          // axe-core 결과를 저장
          window.axeResults = results;
          console.log('axe-core 분석 결과:', results);
          
          // 기존 분석 수행
          activateTab('contrast');
          checkColorContrast();
          
          setTimeout(() => {
            statusDiv.textContent = 'WCAG 접근성 분석 중...';
            activateTab('wcag');
            analyzeWCAG();
            
            setTimeout(() => {
              statusDiv.textContent = 'UDL 학습성 분석 중...';
              activateTab('udl');
              analyzeForUDL();
              
              setTimeout(() => {
                statusDiv.textContent = '전체 검사가 완료되었습니다!';
                activateTab('summary');
                
                // 3초 후 알림 메시지 제거
                setTimeout(() => {
                  document.body.removeChild(statusDiv);
                }, 3000);
              }, 1000);
            }, 1000);
          }, 1000);
        })
        .catch(error => {
          console.error('전체 스캔 중 오류 발생:', error);
          statusDiv.textContent = '전체 검사 중 오류가 발생했습니다. 개별 검사를 진행합니다.';
          
          // 오류 발생 시 기존 방식으로 진행
          activateTab('contrast');
          checkColorContrast();
          
          setTimeout(() => {
            activateTab('wcag');
            analyzeWCAG();
            
            setTimeout(() => {
              activateTab('udl');
              analyzeForUDL();
              
              setTimeout(() => {
                activateTab('summary');
                
                // 3초 후 알림 메시지 제거
                setTimeout(() => {
                  document.body.removeChild(statusDiv);
                }, 3000);
              }, 1000);
            }, 1000);
          }, 1000);
        });
    }
  
    function downloadReport() {
      // HTML 보고서 생성
      const reportTitle = document.title || 'Untitled Page';
      const timestamp = new Date().toLocaleString();
      
      let reportHtml = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle} - 웹 접근성 및 UDL 분석 보고서</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
            header { margin-bottom: 30px; }
            h1 { color: #2c5282; }
            h2 { color: #3a7bd5; margin-top: 30px; border-bottom: 1px solid #e9ecef; padding-bottom: 10px; }
            h3 { margin-top: 20px; }
            .report-section { margin-bottom: 20px; }
            .summary-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .fail-item { background: rgba(250, 82, 82, 0.05); padding: 10px; margin: 10px 0; border-left: 3px solid #fa5252; }
            .pass-item { background: rgba(64, 192, 87, 0.05); padding: 10px; margin: 10px 0; border-left: 3px solid #40c057; }
            footer { margin-top: 50px; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <header>
            <h1>${reportTitle} - 색상 대비 분석 보고서</h1>
            <p>생성일시: ${timestamp}</p>
            <p>URL: ${window.location.href}</p>
          </header>
          
          <div class="report-section">
            <h2>요약</h2>
            <div class="summary-box">
              <p>이 보고서는 WCAG 2.2 지침의 색상 대비 요구사항에 따라 웹 페이지를 분석한 결과입니다.</p>
      `;
      
      // 색상 대비 요약
      const contrastFails = document.querySelectorAll('.contrast-item.contrast-fail').length;
      const contrastTotal = document.querySelectorAll('.contrast-item').length;
      const contrastPassRate = contrastTotal ? Math.round((contrastTotal - contrastFails) / contrastTotal * 100) : 0;
      
      reportHtml += `
            <p><strong>색상 대비:</strong> ${contrastTotal}개 중 ${contrastTotal - contrastFails}개 통과 (${contrastPassRate}%)</p>
            </div>
          </div>
          
          <div class="report-section">
            <h2>색상 대비 분석</h2>
      `;
      
      // 색상 대비 실패 항목
      if (contrastFails > 0) {
        reportHtml += `<h3>색상 대비 부적합 항목 (${contrastFails}개)</h3>`;
        
        document.querySelectorAll('.contrast-item.contrast-fail').forEach(item => {
          const itemText = item.querySelector('.item-text').textContent;
          const ratioMatch = item.querySelector('.ratio-value strong');
          const contrast = ratioMatch ? ratioMatch.textContent.replace(':1', '') : '?';
          
          // 색상 정보 추출
          const textColorChip = item.querySelector('.color-chip:first-child .color-code');
          const bgColorChip = item.querySelector('.color-chip:last-child .color-code');
          
          const textColor = textColorChip ? textColorChip.textContent : '#000000';
          const bgColor = bgColorChip ? bgColorChip.textContent : '#FFFFFF';
          
          reportHtml += `
            <div class="fail-item">
              <p>텍스트: "${itemText}"</p>
              <p>대비율: ${contrast}:1</p>
              <p>텍스트 색상: ${textColor}, 배경 색상: ${bgColor}</p>
            </div>
          `;
        });
      }
      
      // 색상 대비 통과 항목
      const contrastPasses = contrastTotal - contrastFails;
      if (contrastPasses > 0) {
        reportHtml += `<h3>색상 대비 적합 항목 (${contrastPasses}개)</h3>`;
        
        document.querySelectorAll('.contrast-item.contrast-pass').forEach(item => {
          const itemText = item.querySelector('.item-text').textContent;
          const ratioMatch = item.querySelector('.ratio-value strong');
          const contrast = ratioMatch ? ratioMatch.textContent.replace(':1', '') : '?';
          
          // 색상 정보 추출
          const textColorChip = item.querySelector('.color-chip:first-child .color-code');
          const bgColorChip = item.querySelector('.color-chip:last-child .color-code');
          
          const textColor = textColorChip ? textColorChip.textContent : '#000000';
          const bgColor = bgColorChip ? bgColorChip.textContent : '#FFFFFF';
          
          reportHtml += `
            <div class="pass-item">
              <p>텍스트: "${itemText}"</p>
              <p>대비율: ${contrast}:1</p>
              <p>텍스트 색상: ${textColor}, 배경 색상: ${bgColor}</p>
            </div>
          `;
        });
      }
      
      reportHtml += `
          </div>
          
          <div class="report-section">
            <h2>웹 접근성 분석</h2>
            <div class="summary-box">
              <p>이 보고서는 한국형 웹 콘텐츠 접근성 지침 2.2를 기준으로 페이지를 분석한 결과입니다.</p>
            </div>
      `;
      
      // WCAG 카테고리별 결과
      for (const [key, category] of Object.entries(KWCAG22)) {
        reportHtml += `<h3>${category.name}</h3>`;
        
        // 해당 카테고리의 항목들을 추출
        const items = Array.from(document.querySelectorAll(`#tab-content-wcag .guideline-item[data-category="${key}"]`));
        
        if (items.length === 0) {
          continue; // 해당 카테고리의 항목이 없으면 건너뛰기
        }
        
        items.forEach(item => {
          const title = item.querySelector('h4')?.textContent.trim() || '';
          const desc = item.querySelector('p')?.textContent.trim() || '';
          const status = item.classList.contains('pass') ? 'pass' : 
                       item.classList.contains('fail') ? 'fail' : 'review';
          
          // 결과 메시지 추출
          const messageElement = item.querySelector('p:nth-child(3)');
          const message = messageElement ? messageElement.textContent.trim() : '';
          
          reportHtml += `
            <div class="${status}-item">
              <p><strong>${title}</strong></p>
              <p>${desc}</p>
              ${message ? `<p>${message}</p>` : ''}
            </div>
          `;
        });
      }
      
      // UDL 분석 결과
      reportHtml += `
          </div>
          
          <div class="report-section">
            <h2>UDL 원칙 분석</h2>
            <div class="summary-box">
              <p>UDL(보편적 학습 설계) 원칙에 따른 웹 페이지 분석 결과입니다.</p>
            </div>
      `;
      
      // UDL 원칙별 결과
      for (const [key, principle] of Object.entries(UDL_PRINCIPLES)) {
        reportHtml += `
          <h3>${principle.name}</h3>
          <p>${principle.desc}</p>
          <ul>
        `;
        
        principle.suggestions.forEach(suggestion => {
          reportHtml += `<li>${suggestion}</li>`;
        });
        
        reportHtml += `</ul>`;
      }
      
      // AI 분석 결과가 있는 경우
      const aiResponseDiv = document.querySelector('#tab-content-udl .ai-response');
      
      if (aiResponseDiv) {
        reportHtml += `
          <h3>AI 분석 결과</h3>
          <div class="summary-box">
            ${aiResponseDiv.innerHTML}
          </div>
        `;
      }
      
      reportHtml += `
          </div>
          
          <footer>
            <p>이 보고서는 UDL 분석 도구에 의해 자동으로 생성되었습니다.</p>
            <p>분석에 axe-core ${window.axeResults ? window.axeResults.testEngine.version : ''}이 사용되었습니다.</p>
            <p>생성일시: ${timestamp}</p>
          </footer>
        </body>
        </html>
      `;
      
      // Blob 생성 및 다운로드
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '-')}-접근성-보고서-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    function removeHighlights() {
      document.querySelectorAll('.item-highlight').forEach(el => {
        el.classList.remove('item-highlight');
      });
    }
  
    // 현재 페이지의 접근성 분석 함수 추가
    function analyzeCurrentPage() {
      const analysis = {
        summary: '',
        issues: [],
        samples: ''
      };
      
      // axe-core를 사용한 접근성 분석 먼저 수행
      loadAxeCore()
        .then(axe => {
          // axe-core 설정
          axe.configure({
            reporter: 'v2',
            rules: []
          });
          
          // axe-core 실행
          return axe.run(document, {
            resultTypes: ['violations', 'incomplete'],
            selectors: true
          });
        })
        .then(results => {
          // axe-core 결과를 분석 객체에 추가
          if (results.violations.length > 0) {
            analysis.issues.push(`- axe-core 분석: ${results.violations.length}개의 접근성 위반 발견`);
            
            // 가장 심각한 위반사항 샘플 추가
            const criticalViolations = results.violations.filter(v => v.impact === 'critical');
            if (criticalViolations.length > 0) {
              const firstViolation = criticalViolations[0];
              analysis.samples += `주요 접근성 위반 예시 (${firstViolation.id}):\n`;
              analysis.samples += `문제: ${firstViolation.help}\n`;
              if (firstViolation.nodes && firstViolation.nodes.length > 0) {
                analysis.samples += `HTML: ${firstViolation.nodes[0].html}\n\n`;
              }
            }
          }
          
          if (results.incomplete.length > 0) {
            analysis.issues.push(`- axe-core 분석: ${results.incomplete.length}개의 항목 수동 검토 필요`);
          }
          
          // 기존 분석 로직도 계속 실행
          continueAnalysis();
        })
        .catch(error => {
          console.error('axe-core 분석 오류:', error);
          // 오류 발생 시 기존 분석 로직으로 진행
          continueAnalysis();
        });
        
      function continueAnalysis() {
        // 1. 이미지 대체 텍스트 확인
        const images = Array.from(document.querySelectorAll('img')).filter(img => !img.closest('#udl-accessibility-panel'));
        const imagesWithoutAlt = images.filter(img => !img.hasAttribute('alt'));
        
        if (imagesWithoutAlt.length > 0) {
          analysis.issues.push(`- 대체 텍스트가 없는 이미지 ${imagesWithoutAlt.length}개 발견`);
          if (imagesWithoutAlt[0]) {
            analysis.samples += `이미지 태그 예시:\n${imagesWithoutAlt[0].outerHTML}\n\n`;
          }
        }
        
        // 2. 색상 대비 문제 확인
        const contrastResults = document.querySelectorAll('.contrast-item');
        const contrastFails = document.querySelectorAll('.contrast-item.contrast-fail');
        
        if (contrastFails.length > 0) {
          analysis.issues.push(`- 색상 대비가 부적절한 요소 ${contrastFails.length}개 발견`);
        }
        
        // 3. 페이지 제목 확인
        if (!document.title || document.title.trim() === '') {
          analysis.issues.push('- 페이지 제목이 없음');
        }
        
        // 4. 폼 레이블 확인
        const formElements = Array.from(document.querySelectorAll('input, select, textarea')).filter(el => !el.closest('#udl-accessibility-panel'));
        const formElementsWithoutLabels = formElements.filter(el => {
          const id = el.getAttribute('id');
          if (!id) return true;
          
          // 명시적인 레이블 확인
          const hasExplicitLabel = document.querySelector(`label[for="${id}"]`);
          // 암묵적인 레이블 확인
          const hasImplicitLabel = el.closest('label');
          // aria-labelledby 확인
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          // aria-label 확인
          const ariaLabel = el.getAttribute('aria-label');
          
          return !hasExplicitLabel && !hasImplicitLabel && !ariaLabelledBy && !ariaLabel;
        });
        
        if (formElementsWithoutLabels.length > 0) {
          analysis.issues.push(`- 레이블이 없는 폼 요소 ${formElementsWithoutLabels.length}개 발견`);
          if (formElementsWithoutLabels[0]) {
            analysis.samples += `레이블 없는 폼 요소 예시:\n${formElementsWithoutLabels[0].outerHTML}\n\n`;
          }
        }
        
        // 5. 헤딩 구조 확인
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(h => !h.closest('#udl-accessibility-panel'));
        const hasH1 = headings.some(h => h.tagName.toLowerCase() === 'h1');
        
        if (!hasH1 && headings.length > 0) {
          analysis.issues.push('- H1 태그가 없음');
        }
        
        // 6. ARIA 역할 사용 확인
        const elementsWithARIA = Array.from(document.querySelectorAll('[role]')).filter(el => !el.closest('#udl-accessibility-panel'));
        const validRoles = [
          'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox', 
          'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 
          'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 
          'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 
          'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 
          'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 
          'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton', 
          'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 
          'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
        ];
        
        const elementsWithInvalidARIA = elementsWithARIA.filter(el => {
          const role = el.getAttribute('role');
          return !validRoles.includes(role);
        });
        
        if (elementsWithInvalidARIA.length > 0) {
          analysis.issues.push(`- 유효하지 않은 ARIA 역할을 가진 요소 ${elementsWithInvalidARIA.length}개 발견`);
          if (elementsWithInvalidARIA[0]) {
            analysis.samples += `유효하지 않은 ARIA 역할 예시:\n${elementsWithInvalidARIA[0].outerHTML}\n\n`;
          }
        }
        
        // 요약 정보 생성
        if (analysis.issues.length === 0) {
          analysis.summary = '자동 분석 결과, 주요 접근성 문제가 발견되지 않았습니다.';
          analysis.issues.push('- 자동 검출된 주요 접근성 문제 없음');
        } else {
          analysis.summary = `자동 분석 결과, ${analysis.issues.length}개의 접근성 문제가 발견되었습니다.`;
        }
        
        return analysis;
      }
    }

    // 기존 analyzeWCAGItem 함수 재구현
    function analyzeWCAGItem(item) {
      // 각 항목에 대한 분석 로직
      // 여기서는 간단한 분석만 수행하며 실제 구현 시 더 정교한 검사 필요
      switch (item.id) {
        case "1.1.1": // 대체 텍스트
          const images = Array.from(document.querySelectorAll('img')).filter(img => !img.closest('#udl-accessibility-panel'));
          const imagesWithoutAlt = images.filter(img => !img.hasAttribute('alt'));
          
          if (imagesWithoutAlt.length > 0) {
            return {
              status: 'fail',
              message: `대체 텍스트가 없는 이미지 ${imagesWithoutAlt.length}개 발견`,
              elements: imagesWithoutAlt
            };
          }
          return { status: 'pass', message: `모든 이미지(${images.length}개)에 대체 텍스트 제공됨` };
  
        case "1.2.1": // 자막 제공
          const videos = Array.from(document.querySelectorAll('video, audio')).filter(v => !v.closest('#udl-accessibility-panel'));
          if (videos.length > 0) {
            return { 
              status: 'review', 
              message: `멀티미디어 콘텐츠 ${videos.length}개 발견. 자막 또는 대체 수단 제공 확인 필요`,
              elements: videos
            };
          }
          return { status: 'pass', message: '멀티미디어 콘텐츠가 발견되지 않음' };
  
        case "1.3.1": // 표의 구성
          const tables = Array.from(document.querySelectorAll('table')).filter(t => !t.closest('#udl-accessibility-panel'));
          const tablesWithoutTh = tables.filter(table => table.querySelectorAll('th').length === 0);
          
          if (tablesWithoutTh.length > 0) {
            return { 
              status: 'fail', 
              message: `제목 셀(th)이 없는 표 ${tablesWithoutTh.length}개 발견`,
              elements: tablesWithoutTh
            };
          }
          return { status: tables.length > 0 ? 'pass' : 'review', message: tables.length > 0 ? `모든 표(${tables.length}개)에 제목 셀 제공됨` : '표 요소 발견되지 않음' };
  
        case "1.3.2": // 콘텐츠의 선형구조
          // 단순 검사로 tabindex 값이 0보다 큰 경우 검색
          const elementsWithPositiveTabindex = Array.from(document.querySelectorAll('[tabindex]')).filter(el => 
            !el.closest('#udl-accessibility-panel') && parseInt(el.getAttribute('tabindex')) > 0);
          
          if (elementsWithPositiveTabindex.length > 0) {
            return { 
              status: 'fail', 
              message: `콘텐츠의 논리적 순서를 방해할 수 있는 양수 tabindex ${elementsWithPositiveTabindex.length}개 발견`,
              elements: elementsWithPositiveTabindex
            };
          }
          return { status: 'pass', message: '논리적 순서에 영향을 주는 요소 발견되지 않음' };
  
        case "1.4.3": // 텍스트 콘텐츠의 명도 대비
          const contrastResults = document.querySelectorAll('.contrast-item');
          const contrastFails = document.querySelectorAll('.contrast-item.contrast-fail');
          
          if (contrastFails.length > 0) {
            // 첫 번째 실패 항목의 요소를 가져옴
            const firstFailElement = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span, li, td, th, div, label, button'))
              .filter(el => !el.closest('#udl-accessibility-panel') && el.classList.contains('item-highlight'));
            
            return { 
              status: 'fail', 
              message: `색상 대비가 부적합한 텍스트 ${contrastFails.length}개 발견`,
              elements: firstFailElement.length > 0 ? [firstFailElement[0]] : []
            };
          }
          return { status: 'pass', message: `모든 텍스트 콘텐츠의 색상 대비가 적합함` };
  
        case "2.1.1": // 키보드 사용 보장
          // onclick 이벤트만 있고 onkeydown/onkeyup/onkeypress가 없는 요소 찾기
          const interactiveElements = Array.from(document.querySelectorAll('a, button, [role="button"], [onclick]'))
            .filter(el => !el.closest('#udl-accessibility-panel'));
          
          const keyboardInaccessible = interactiveElements.filter(el => {
            const hasClick = el.hasAttribute('onclick') || el.onclick;
            const hasKeyEvent = el.hasAttribute('onkeydown') || el.onkeydown || 
                               el.hasAttribute('onkeyup') || el.onkeyup ||
                               el.hasAttribute('onkeypress') || el.onkeypress;
            const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
            
            // a 태그의 href가 없거나 '#'인 경우와 button이 아닌데 role="button"도 없는 경우
            const isInaccesible = (el.tagName === 'A' && (!el.hasAttribute('href') || el.getAttribute('href') === '#')) ||
                                (el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button' && hasClick);
            
            return !isDisabled && (isInaccesible || (hasClick && !hasKeyEvent));
          });
          
          if (keyboardInaccessible.length > 0) {
            return { 
              status: 'fail', 
              message: `키보드로 접근이 어려울 수 있는 상호작용 요소 ${keyboardInaccessible.length}개 발견`,
              elements: keyboardInaccessible
            };
          }
          return { status: 'pass', message: '모든 상호작용 요소가 키보드로 접근 가능함' };
  
        case "2.4.1": // 반복 영역 건너뛰기
          // 건너뛰기 링크 찾기
          const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]'))
            .filter(a => 
              !a.closest('#udl-accessibility-panel') && 
              (a.textContent.toLowerCase().includes('skip') || 
               a.textContent.includes('건너뛰') || 
               a.textContent.includes('바로가기'))
            );
          
          if (skipLinks.length === 0) {
            return { 
              status: 'fail', 
              message: '반복 영역을 건너뛸 수 있는 링크가 발견되지 않음',
              elements: []
            };
          }
          return { status: 'pass', message: `건너뛰기 링크 ${skipLinks.length}개 발견됨` };
  
        case "2.4.2": // 제목 제공
          // 페이지 타이틀 확인
          if (!document.title || document.title.trim() === '') {
            return { 
              status: 'fail', 
              message: '페이지에 제목이 제공되지 않음',
              elements: [document.querySelector('head > title') || document.querySelector('head')]
            };
          }
          
          // 프레임 제목 확인
          const frames = Array.from(document.querySelectorAll('iframe, frame')).filter(f => !f.closest('#udl-accessibility-panel'));
          const framesWithoutTitle = frames.filter(frame => !frame.hasAttribute('title') || frame.getAttribute('title').trim() === '');
          
          if (framesWithoutTitle.length > 0) {
            return { 
              status: 'fail', 
              message: `제목이 없는 프레임 ${framesWithoutTitle.length}개 발견`,
              elements: framesWithoutTitle
            };
          }
          
          return { status: 'pass', message: '페이지 및 모든 프레임에 제목이 제공됨' };
  
        case "3.3.2": // 레이블 제공
          // 레이블이 없는 입력 필드 찾기
          const inputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(input => 
            !input.closest('#udl-accessibility-panel') && 
            input.type !== 'hidden' && 
            input.type !== 'button' && 
            input.type !== 'submit' && 
            input.type !== 'reset' && 
            input.type !== 'image');
          
          const inputsWithoutLabel = inputs.filter(input => {
            const id = input.getAttribute('id');
            const hasExplicitLabel = id && document.querySelector(`label[for="${id}"]`);
            const hasImplicitLabel = input.closest('label');
            const hasAriaLabel = input.hasAttribute('aria-label') && input.getAttribute('aria-label').trim() !== '';
            const hasAriaLabelledBy = input.hasAttribute('aria-labelledby') && 
                                    document.getElementById(input.getAttribute('aria-labelledby'));
            const hasTitle = input.hasAttribute('title') && input.getAttribute('title').trim() !== '';
            
            return !(hasExplicitLabel || hasImplicitLabel || hasAriaLabel || hasAriaLabelledBy || hasTitle);
          });
          
          if (inputsWithoutLabel.length > 0) {
            return { 
              status: 'fail', 
              message: `레이블이 없는 입력 필드 ${inputsWithoutLabel.length}개 발견`,
              elements: inputsWithoutLabel
            };
          }
          return { status: inputs.length > 0 ? 'pass' : 'review', message: inputs.length > 0 ? `모든 입력 필드(${inputs.length}개)에 레이블 제공됨` : '입력 필드 발견되지 않음' };
  
        case "4.1.1": // 마크업 오류 방지
          // 간단한 검사로 태그 중첩 문제 확인
          const hasInvalidNesting = document.querySelector('a a, button button, h1 h1, h2 h2, h3 h3, h4 h4, h5 h5, h6 h6');
          
          if (hasInvalidNesting) {
            return { 
              status: 'fail', 
              message: '부적절한 태그 중첩 발견',
              elements: [hasInvalidNesting]
            };
          }
          
          // ID 중복 확인
          const ids = {};
          const elementsWithId = document.querySelectorAll('[id]');
          let duplicateIdElement = null;
          
          for (const el of elementsWithId) {
            if (el.closest('#udl-accessibility-panel')) continue;
            
            const id = el.getAttribute('id');
            if (ids[id]) {
              duplicateIdElement = el;
              break;
            }
            ids[id] = true;
          }
          
          if (duplicateIdElement) {
            return { 
              status: 'fail', 
              message: '중복된 ID 값 발견',
              elements: [duplicateIdElement]
            };
          }
          
          return { status: 'pass', message: '마크업 오류가 발견되지 않음' };
  
        // 다른 검사항목에 대한 분석 로직 추가 가능
        default:
          return { status: 'review', message: '자동 검사가 불가능한 항목입니다. 수동 검토가 필요합니다.' };
      }
    }

    // 스크롤을 항상 맨 아래로 이동시키는 함수
    function scrollToBottom(container) {
      if (!container) {
        container = document.querySelector('.chat-messages');
        if (!container) return;
      }
      
      try {
        // 즉시 스크롤
        container.scrollTop = container.scrollHeight;
        
        // 보조 방법 - 스크롤 위치 강제 설정
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          
          // 스크롤이 제대로 적용되었는지 확인
          if (container.scrollTop + container.clientHeight < container.scrollHeight - 20) {
            console.log('스크롤 강제 재조정');
            container.scrollTop = container.scrollHeight;
          }
        });
      } catch (error) {
        console.error('스크롤 처리 중 오류:', error);
      }
    }

    // KWCAG 요약 정보를 가져오는 함수
    function getKWCAGSummaryForPrompt() {
      let summary = '';
      
      // KWCAG22 객체의 모든 카테고리를 순회하며 문자열 구성
      for (const [key, category] of Object.entries(KWCAG22)) {
        summary += `## ${category.name}\n`;
        
        // 각 카테고리의 항목들을 순회
        category.items.forEach(item => {
          summary += `- **${item.id} (${item.name})**: ${item.desc}\n`;
        });
        
        summary += '\n';
      }
      
      return summary;
    }

    // 색맹 시뮬레이션 관련 함수들
    function checkColorBlindness() {
      const colorblindContent = document.getElementById('tab-content-colorblind');
      colorblindContent.innerHTML = '<div class="loading">색맹 검사 도구 로딩 중...</div>';

      setTimeout(() => {
        colorblindContent.innerHTML = `
          <div class="colorblind-tester">
            <div class="contrast-summary">
              <h3>색맹 시뮬레이션 도구</h3>
              <p>웹 페이지의 색상이 색맹 사용자에게 어떻게 보이는지 시뮬레이션합니다.</p>
              <p>아래에서 시뮬레이션할 색맹 유형을 선택하세요:</p>
            </div>
            
            <div class="colorblind-controls">
              <div class="control-group">
                <label for="colorblind-type">색맹 유형</label>
                <select id="colorblind-type" class="select-control">
                  <option value="normal">일반 시력</option>
                  <option value="protanopia">적색맹 (Protanopia)</option>
                  <option value="deuteranopia">녹색맹 (Deuteranopia)</option>
                  <option value="tritanopia">청색맹 (Tritanopia)</option>
                  <option value="achromatopsia">완전색맹 (Achromatopsia)</option>
                </select>
              </div>
              
              <div class="control-group">
                <label for="colorblind-strength">강도</label>
                <input type="range" id="colorblind-strength" min="0" max="100" value="100" class="range-control">
                <span id="strength-value">100%</span>
              </div>
            </div>
            
            <div class="colorblind-preview">
              <div class="preview-container">
                <h4>원본 색상</h4>
                <div class="color-samples original-samples">
                  <div class="color-sample" style="background-color: #E53935;">#E53935 (빨강)</div>
                  <div class="color-sample" style="background-color: #43A047;">#43A047 (녹색)</div>
                  <div class="color-sample" style="background-color: #1E88E5;">#1E88E5 (파랑)</div>
                  <div class="color-sample" style="background-color: #FDD835;">#FDD835 (노랑)</div>
                  <div class="color-sample" style="background-color: #8E24AA;">#8E24AA (보라)</div>
                  <div class="color-sample" style="background-color: #00ACC1;">#00ACC1 (청록)</div>
                  <div class="color-sample" style="background-color: #FF9800;">#FF9800 (주황)</div>
                  <div class="color-sample" style="background-color: #6D4C41;">#6D4C41 (갈색)</div>
                </div>
              </div>
              
              <div class="preview-container">
                <h4>시뮬레이션 결과</h4>
                <div class="color-samples" id="colorblind-samples">
                </div>
              </div>
            </div>
            
            <div class="colorblind-upload">
              <h4>이미지 색맹 시뮬레이션</h4>
              <p>이미지를 업로드하여 색맹 시뮬레이션을 확인할 수 있습니다:</p>
              <input type="file" id="image-upload" accept="image/*" class="file-input">
              <div class="image-preview-container">
                <div class="image-preview">
                  <div class="preview-original">
                    <h5>원본 이미지</h5>
                    <div id="original-image-preview"></div>
                  </div>
                  <div class="preview-simulation">
                    <h5>시뮬레이션 결과</h5>
                    <canvas id="simulation-canvas"></canvas>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="colorblind-info">
              <h4>색맹에 대한 안내</h4>
              <ul>
                <li><strong>적색맹 (Protanopia):</strong> 적색 수용체의 기능이 약하거나 없어 빨강색을 식별하기 어렵습니다.</li>
                <li><strong>녹색맹 (Deuteranopia):</strong> 녹색 수용체의 기능이 약하거나 없어 녹색을 식별하기 어렵습니다.</li>
                <li><strong>청색맹 (Tritanopia):</strong> 청색 수용체의 기능이 약하거나 없어 파랑색을 식별하기 어렵습니다.</li>
                <li><strong>완전색맹 (Achromatopsia):</strong> 모든 색상을 흑백으로만 인식합니다.</li>
              </ul>
              <h4>접근성 높은 디자인을 위한 팁</h4>
              <ul>
                <li>색상만으로 정보를 구분하지 말고 항상 텍스트나 아이콘, 패턴 등의 부가적인 방법을 함께 사용하세요.</li>
                <li>색상 대비를 높게 유지하고, 특히 빨강/녹색 조합은 피하세요.</li>
                <li>사용자가 색상을 개인화할 수 있는 옵션을 제공하세요.</li>
                <li>중요한 UI 요소에는 색상 외에도 형태, 크기, 위치 등으로 차별화하세요.</li>
              </ul>
            </div>
          </div>
          
          <style>
            .colorblind-tester {
              padding: 0 0 20px 0;
            }
            
            .colorblind-controls {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              margin-bottom: 24px;
            }
            
            .control-group {
              flex: 1;
              min-width: 200px;
            }
            
            .select-control {
              width: 100%;
              padding: 8px;
              border-radius: 4px;
              border: 1px solid #ced4da;
              margin-top: 4px;
            }
            
            .range-control {
              width: 100%;
              margin-top: 4px;
            }
            
            .colorblind-preview {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              margin-bottom: 24px;
            }
            
            .preview-container {
              flex: 1;
              min-width: 250px;
            }
            
            .color-samples {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
              gap: 12px;
            }
            
            .color-sample {
              padding: 12px;
              border-radius: 4px;
              color: white;
              text-shadow: 0 0 2px rgba(0,0,0,0.7);
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              height: 60px;
            }
            
            .colorblind-upload {
              margin-bottom: 24px;
            }
            
            .file-input {
              margin: 10px 0;
            }
            
            .image-preview-container {
              margin-top: 16px;
            }
            
            .image-preview {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
            }
            
            .preview-original, .preview-simulation {
              flex: 1;
              min-width: 250px;
            }
            
            #original-image-preview img, #simulation-canvas {
              max-width: 100%;
              border: 1px solid #ced4da;
              border-radius: 4px;
            }
            
            .colorblind-info {
              background-color: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            
            .colorblind-info h4 {
              margin-top: 0;
              margin-bottom: 12px;
              color: #343a40;
            }
            
            .colorblind-info ul {
              margin-bottom: 20px;
            }
            
            .colorblind-info li {
              margin-bottom: 8px;
              color: #495057;
            }
          </style>
        `;

        initColorBlindTester();
      }, 500);
    }

    function initColorBlindTester() {
      const typeSelect = document.getElementById('colorblind-type');
      const strengthSlider = document.getElementById('colorblind-strength');
      const strengthValue = document.getElementById('strength-value');
      const samplesContainer = document.getElementById('colorblind-samples');
      const imageUpload = document.getElementById('image-upload');
      const originalPreview = document.getElementById('original-image-preview');
      const simulationCanvas = document.getElementById('simulation-canvas');

      const originalColors = [
        { hex: '#E53935', name: '빨강' },
        { hex: '#43A047', name: '녹색' },
        { hex: '#1E88E5', name: '파랑' },
        { hex: '#FDD835', name: '노랑' },
        { hex: '#8E24AA', name: '보라' },
        { hex: '#00ACC1', name: '청록' },
        { hex: '#FF9800', name: '주황' },
        { hex: '#6D4C41', name: '갈색' }
      ];

      const matrices = {
        normal: [
          1, 0, 0, 0, 0,
          0, 1, 0, 0, 0,
          0, 0, 1, 0, 0,
          0, 0, 0, 1, 0
        ],
        protanopia: [
          0.567, 0.433, 0, 0, 0,
          0.558, 0.442, 0, 0, 0,
          0, 0.242, 0.758, 0, 0,
          0, 0, 0, 1, 0
        ],
        deuteranopia: [
          0.625, 0.375, 0, 0, 0,
          0.7, 0.3, 0, 0, 0,
          0, 0.3, 0.7, 0, 0,
          0, 0, 0, 1, 0
        ],
        tritanopia: [
          0.95, 0.05, 0, 0, 0,
          0, 0.433, 0.567, 0, 0,
          0, 0.475, 0.525, 0, 0,
          0, 0, 0, 1, 0
        ],
        achromatopsia: [
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0, 0, 0, 1, 0
        ]
      };

      updateColorSamples();

      typeSelect.addEventListener('change', updateColorSamples);
      strengthSlider.addEventListener('input', function() {
        strengthValue.textContent = this.value + '%';
        updateColorSamples();
      });

      imageUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
              originalPreview.innerHTML = '';
              originalPreview.appendChild(img.cloneNode());
              applyColorBlindFilter(img);
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });

      function updateColorSamples() {
        const type = typeSelect.value;
        const strength = parseFloat(strengthSlider.value) / 100;

        samplesContainer.innerHTML = '';

        originalColors.forEach(color => {
          const sample = document.createElement('div');
          sample.className = 'color-sample';
          sample.textContent = `${color.hex} (${color.name})`;

          const transformedColor = applyColorMatrix(color.hex, type, strength);
          sample.style.backgroundColor = transformedColor;

          const rgb = hexToRgb(transformedColor);
          const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
          sample.style.color = brightness > 125 ? 'black' : 'white';
          sample.style.textShadow = brightness > 125 ? '0 0 2px rgba(255,255,255,0.7)' : '0 0 2px rgba(0,0,0,0.7)';

          samplesContainer.appendChild(sample);
        });

        const img = originalPreview.querySelector('img');
        if (img) {
          applyColorBlindFilter(img);
        }
      }

      function applyColorMatrix(hexColor, type, strength) {
        const rgb = hexToRgb(hexColor);
        const matrix = matrices[type];

        if (!matrix) return hexColor;

        const blendedMatrix = [];
        for (let i = 0; i < matrices.normal.length; i++) {
          blendedMatrix[i] = matrices.normal[i] * (1 - strength) + matrix[i] * strength;
        }

        const r = rgb.r * blendedMatrix[0] + rgb.g * blendedMatrix[1] + rgb.b * blendedMatrix[2];
        const g = rgb.r * blendedMatrix[5] + rgb.g * blendedMatrix[6] + rgb.b * blendedMatrix[7];
        const b = rgb.r * blendedMatrix[10] + rgb.g * blendedMatrix[11] + rgb.b * blendedMatrix[12];

        return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
      }

      function applyColorBlindFilter(img) {
        const type = typeSelect.value;
        const strength = parseFloat(strengthSlider.value) / 100;
        const canvas = simulationCanvas;
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0, img.width, img.height);

        if (type !== 'normal') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const matrix = matrices[type];

          const blendedMatrix = [];
          for (let i = 0; i < matrices.normal.length; i++) {
            blendedMatrix[i] = matrices.normal[i] * (1 - strength) + matrix[i] * strength;
          }

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i] = r * blendedMatrix[0] + g * blendedMatrix[1] + b * blendedMatrix[2];
            data[i + 1] = r * blendedMatrix[5] + g * blendedMatrix[6] + b * blendedMatrix[7];
            data[i + 2] = r * blendedMatrix[10] + g * blendedMatrix[11] + b * blendedMatrix[12];
          }

          ctx.putImageData(imageData, 0, 0);
        }
      }

      function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        const bigint = parseInt(hex, 16);
        return {
          r: (bigint >> 16) & 255,
          g: (bigint >> 8) & 255,
          b: bigint & 255
        };
      }
    }
  })();
