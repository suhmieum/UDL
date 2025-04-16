javascript:(function(){
  // 명암대비 비율 계산 함수
  function calculateContrastRatio(color1, color2) {
    // RGB 값을 상대 휘도로 변환
    function getLuminance(rgb) {
      const sRGB = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }
    
    // 밝기가 높은 색을 L1으로, 낮은 색을 L2로 설정
    const L1 = Math.max(getLuminance(color1), getLuminance(color2));
    const L2 = Math.min(getLuminance(color1), getLuminance(color2));
    
    // 명암대비 비율 계산
    return (L1 + 0.05) / (L2 + 0.05);
  }
  
  // 16진수 색상값을 RGB 배열로 변환
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return [r, g, b];
  }
  
  // RGB 문자열을 RGB 배열로 변환
  function parseRgb(rgb) {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0];
  }
  
  // RGBA 문자열을 RGB 배열로 변환
  function parseRgba(rgba) {
    const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0];
  }
  
  // 색상 형식 분석
  function parseColor(color) {
    if (color.startsWith('#')) {
      return hexToRgb(color);
    } else if (color.startsWith('rgb(')) {
      return parseRgb(color);
    } else if (color.startsWith('rgba(')) {
      return parseRgba(color);
    }
    
    // 색상 이름 처리 (간단한 대표적인 색상만)
    const colors = {
      'black': [0, 0, 0],
      'white': [255, 255, 255],
      'red': [255, 0, 0],
      'green': [0, 128, 0],
      'blue': [0, 0, 255],
      'yellow': [255, 255, 0],
      'gray': [128, 128, 128],
      'transparent': [0, 0, 0]
    };
    
    return colors[color.toLowerCase()] || [0, 0, 0];
  }
  
  // 모든 요소 순회하며 검사
  function checkElements() {
    const allElements = document.querySelectorAll('*');
    const results = [];
    const passCount = {AA: 0, AAA: 0};
    const failCount = {AA: 0, AAA: 0};
    
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      
      // 텍스트가 있는 요소만 검사
      if (element.innerText && element.innerText.trim()) {
        const style = window.getComputedStyle(element);
        const textColor = style.color;
        const bgColor = style.backgroundColor;
        
        // 배경색이 투명한 경우 상위 요소의 배경색을 찾음
        let actualBgColor = bgColor;
        let parentElement = element;
        
        while ((actualBgColor === 'rgba(0, 0, 0, 0)' || actualBgColor === 'transparent') && parentElement.parentElement) {
          parentElement = parentElement.parentElement;
          actualBgColor = window.getComputedStyle(parentElement).backgroundColor;
        }
        
        // 기본 배경색은 흰색으로 가정
        if (actualBgColor === 'rgba(0, 0, 0, 0)' || actualBgColor === 'transparent') {
          actualBgColor = 'rgb(255, 255, 255)';
        }
        
        const textColorRgb = parseColor(textColor);
        const bgColorRgb = parseColor(actualBgColor);
        
        // 명암대비 비율 계산
        const ratio = calculateContrastRatio(textColorRgb, bgColorRgb);
        
        // WCAG 기준에 따른 합격 여부 결정
        // AA 기준: 일반 텍스트 4.5:1, 큰 텍스트 3:1
        // AAA 기준: 일반 텍스트 7:1, 큰 텍스트 4.5:1
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;
        
        // 큰 텍스트 여부 확인 (18pt 이상 또는 14pt 이상이며 굵은 글씨)
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        
        const passAA = isLargeText ? ratio >= 3 : ratio >= 4.5;
        const passAAA = isLargeText ? ratio >= 4.5 : ratio >= 7;
        
        if (passAA) passCount.AA++; else failCount.AA++;
        if (passAAA) passCount.AAA++; else failCount.AAA++;
        
        // 결과 저장
        results.push({
          element: element,
          text: element.innerText.substring(0, 50) + (element.innerText.length > 50 ? '...' : ''),
          textColor: textColor,
          bgColor: actualBgColor,
          ratio: ratio.toFixed(2),
          fontSize: fontSize.toFixed(1) + 'px',
          isLargeText: isLargeText,
          passAA: passAA,
          passAAA: passAAA
        });
      }
    }
    
    return {results, passCount, failCount};
  }
  
  // 결과 표시 UI 생성
  function createResultUI(data) {
    // 기존 결과 제거
    const oldContainer = document.getElementById('udl-contrast-checker-container');
    if (oldContainer) {
      oldContainer.remove();
    }
    
    // 새 결과 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'udl-contrast-checker-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.right = '0';
    container.style.width = '400px';
    container.style.height = '100vh';
    container.style.backgroundColor = 'white';
    container.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.3)';
    container.style.zIndex = '9999999';
    container.style.overflow = 'auto';
    container.style.padding = '16px';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // 타이틀 생성
    const title = document.createElement('h2');
    title.textContent = 'UDL 명암대비 검사 결과';
    title.style.borderBottom = '1px solid #ccc';
    title.style.paddingBottom = '8px';
    container.appendChild(title);
    
    // 닫기 버튼
    const closeButton = document.createElement('button');
    closeButton.textContent = '닫기';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '16px';
    closeButton.style.right = '16px';
    closeButton.style.padding = '4px 8px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
      container.remove();
    };
    container.appendChild(closeButton);
    
    // 요약 정보
    const summary = document.createElement('div');
    summary.style.margin = '16px 0';
    summary.style.padding = '12px';
    summary.style.backgroundColor = '#f5f5f5';
    summary.style.borderRadius = '4px';
    
    // AA 레벨 통계
    const aaStats = document.createElement('p');
    const aaTotal = data.passCount.AA + data.failCount.AA;
    const aaPercent = aaTotal > 0 ? Math.round((data.passCount.AA / aaTotal) * 100) : 0;
    aaStats.innerHTML = `<strong>AA 레벨:</strong> ${data.passCount.AA}개 통과, ${data.failCount.AA}개 실패 (${aaPercent}% 통과)`;
    aaStats.style.marginBottom = '8px';
    summary.appendChild(aaStats);
    
    // AA 레벨 상태 표시
    const aaStatus = document.createElement('div');
    aaStatus.style.height = '10px';
    aaStatus.style.width = '100%';
    aaStatus.style.backgroundColor = '#ffcccc';
    aaStatus.style.borderRadius = '5px';
    aaStatus.style.marginBottom = '16px';
    const aaPassBar = document.createElement('div');
    aaPassBar.style.height = '100%';
    aaPassBar.style.width = aaPercent + '%';
    aaPassBar.style.backgroundColor = '#66cc66';
    aaPassBar.style.borderRadius = '5px';
    aaStatus.appendChild(aaPassBar);
    summary.appendChild(aaStatus);
    
    // AAA 레벨 통계
    const aaaStats = document.createElement('p');
    const aaaTotal = data.passCount.AAA + data.failCount.AAA;
    const aaaPercent = aaaTotal > 0 ? Math.round((data.passCount.AAA / aaaTotal) * 100) : 0;
    aaaStats.innerHTML = `<strong>AAA 레벨:</strong> ${data.passCount.AAA}개 통과, ${data.failCount.AAA}개 실패 (${aaaPercent}% 통과)`;
    aaaStats.style.marginBottom = '8px';
    summary.appendChild(aaaStats);
    
    // AAA 레벨 상태 표시
    const aaaStatus = document.createElement('div');
    aaaStatus.style.height = '10px';
    aaaStatus.style.width = '100%';
    aaaStatus.style.backgroundColor = '#ffcccc';
    aaaStatus.style.borderRadius = '5px';
    const aaaPassBar = document.createElement('div');
    aaaPassBar.style.height = '100%';
    aaaPassBar.style.width = aaaPercent + '%';
    aaaPassBar.style.backgroundColor = '#66cc66';
    aaaPassBar.style.borderRadius = '5px';
    aaaStatus.appendChild(aaaPassBar);
    summary.appendChild(aaaStatus);
    
    container.appendChild(summary);
    
    // 문제 요소 필터링 버튼
    const filterButtons = document.createElement('div');
    filterButtons.style.margin = '16px 0';
    
    const showAllButton = document.createElement('button');
    showAllButton.textContent = '모든 요소 보기';
    showAllButton.style.marginRight = '8px';
    showAllButton.style.padding = '6px 12px';
    showAllButton.onclick = function() {
      const items = document.querySelectorAll('.contrast-item');
      items.forEach(item => item.style.display = 'block');
    };
    filterButtons.appendChild(showAllButton);
    
    const showFailedButton = document.createElement('button');
    showFailedButton.textContent = '실패한 요소만 보기';
    showFailedButton.style.padding = '6px 12px';
    showFailedButton.onclick = function() {
      const items = document.querySelectorAll('.contrast-item');
      items.forEach(item => {
        const passAA = item.getAttribute('data-pass-aa') === 'true';
        item.style.display = passAA ? 'none' : 'block';
      });
    };
    filterButtons.appendChild(showFailedButton);
    
    container.appendChild(filterButtons);
    
    // 결과 목록
    const resultList = document.createElement('div');
    resultList.style.marginTop = '16px';
    
    data.results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'contrast-item';
      item.setAttribute('data-pass-aa', result.passAA);
      item.style.padding = '12px';
      item.style.marginBottom = '12px';
      item.style.borderRadius = '4px';
      item.style.backgroundColor = result.passAA ? '#f0fff0' : '#fff0f0';
      item.style.border = `1px solid ${result.passAA ? '#cceedd' : '#eecccc'}`;
      
      // 텍스트 및 패스/실패 표시
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '8px';
      
      const textPreview = document.createElement('div');
      textPreview.style.fontWeight = 'bold';
      textPreview.textContent = result.text;
      header.appendChild(textPreview);
      
      const status = document.createElement('div');
      status.innerHTML = `
        <span style="color: ${result.passAA ? 'green' : 'red'}; font-weight: bold;">
          AA: ${result.passAA ? '통과' : '실패'}
        </span>
        <span style="margin-left: 8px; color: ${result.passAAA ? 'green' : 'red'}; font-weight: bold;">
          AAA: ${result.passAAA ? '통과' : '실패'}
        </span>
      `;
      header.appendChild(status);
      
      item.appendChild(header);
      
      // 명암대비 정보
      const contrastInfo = document.createElement('div');
      contrastInfo.style.marginBottom = '8px';
      
      // 색상 표시 박스
      const colorBoxes = document.createElement('div');
      colorBoxes.style.display = 'flex';
      colorBoxes.style.marginBottom = '8px';
      
      const textColorBox = document.createElement('div');
      textColorBox.style.width = '20px';
      textColorBox.style.height = '20px';
      textColorBox.style.backgroundColor = result.textColor;
      textColorBox.style.border = '1px solid #ccc';
      textColorBox.style.marginRight = '6px';
      colorBoxes.appendChild(textColorBox);
      
      const bgColorBox = document.createElement('div');
      bgColorBox.style.width = '20px';
      bgColorBox.style.height = '20px';
      bgColorBox.style.backgroundColor = result.bgColor;
      bgColorBox.style.border = '1px solid #ccc';
      colorBoxes.appendChild(bgColorBox);
      
      contrastInfo.appendChild(colorBoxes);
      
      // 명암대비 비율 및 색상 정보
      contrastInfo.innerHTML += `
        <div>명암대비 비율: <strong>${result.ratio}:1</strong> (${result.isLargeText ? '큰 텍스트' : '일반 텍스트'})</div>
        <div>글자 색상: ${result.textColor}</div>
        <div>배경 색상: ${result.bgColor}</div>
        <div>글자 크기: ${result.fontSize}</div>
      `;
      
      item.appendChild(contrastInfo);
      
      // 요소로 이동 버튼
      const highlightButton = document.createElement('button');
      highlightButton.textContent = '요소 확인';
      highlightButton.style.padding = '4px 8px';
      highlightButton.style.cursor = 'pointer';
      highlightButton.onclick = function() {
        // 해당 요소가 화면에 보이도록 스크롤
        result.element.scrollIntoView({behavior: 'smooth', block: 'center'});
        
        // 요소 강조 표시
        const originalOutline = result.element.style.outline;
        const originalBackground = result.element.style.backgroundColor;
        
        result.element.style.outline = '3px solid red';
        result.element.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        
        // 3초 후 원래대로 복원
        setTimeout(() => {
          result.element.style.outline = originalOutline;
          result.element.style.backgroundColor = originalBackground;
        }, 3000);
      };
      
      item.appendChild(highlightButton);
      resultList.appendChild(item);
    });
    
    container.appendChild(resultList);
    document.body.appendChild(container);
  }
  
  // 메인 실행 함수
  const data = checkElements();
  createResultUI(data);
})();
