// 점검원 전용 JavaScript
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// Inspector State
const InspectorState = {
  session: null,
  currentDefectId: null,
  currentCaseId: null,
  allDefects: []
};

// API Client (api.js에서 가져옴)
const api = new APIClient();

// Loading state
let isLoading = false;

function setLoading(loading) {
  isLoading = loading;
  const buttons = $$('.button');
  buttons.forEach(btn => {
    btn.disabled = loading;
    if (loading) {
      btn.style.opacity = '0.6';
    } else {
      btn.style.opacity = '1';
    }
  });
}

function toast(msg, type = 'info') {
  const t = $('.toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 라우팅
const navigationHistory = [];

function route(screen) {
  const currentScreen = Array.from($$('.screen')).find(el => !el.classList.contains('hidden'))?.id;
  
  if (currentScreen && currentScreen !== screen && screen !== 'login') {
    navigationHistory.push(currentScreen);
    if (navigationHistory.length > 10) {
      navigationHistory.shift();
    }
  }
  
  $$('.screen').forEach(el => el.classList.add('hidden'));
  const targetScreen = $(`#${screen}`);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
  }
}

function goBack() {
  if (navigationHistory.length > 0) {
    const previousScreen = navigationHistory.pop();
    route(previousScreen);
  } else {
    route('defect-list');
  }
}

// 로그인
async function onLogin() {
  if (isLoading) return;
  
  const complex = $('#login-complex').value.trim();
  const dong = $('#login-dong').value.trim();
  const ho = $('#login-ho').value.trim();
  const name = $('#login-name').value.trim();
  const phone = $('#login-phone').value.trim();
  
  if (!complex || !dong || !ho || !name || !phone) {
    toast('입력값을 확인해 주세요', 'error');
    return;
  }
  
  // 점검원 권한 체크 (complex === 'admin')
  if (complex.toLowerCase() !== 'admin') {
    toast('점검원은 아파트(단지) 항목에 "admin"을 입력해야 합니다', 'error');
    return;
  }
  
  setLoading(true);
  toast('로그인 중...', 'info');
  
  try {
    const response = await api.login(complex, dong, ho, name, phone);
    
    InspectorState.session = {
      complex, dong, ho, name, phone,
      token: response.token,
      expires_at: response.expires_at
    };
    
    api.setToken(response.token);
    localStorage.setItem('inspector_session', JSON.stringify(InspectorState.session));
    
    toast('✅ 로그인 성공', 'success');
    
    // 하자목록 로드
    await loadAllDefects();
    
    route('defect-list');
    
  } catch (error) {
    console.error('로그인 오류:', error);
    toast(error.message || '로그인 실패', 'error');
  } finally {
    setLoading(false);
  }
}

// 로그아웃
function onLogout() {
  if (confirm('로그아웃하시겠습니까?')) {
    InspectorState.session = null;
    InspectorState.allDefects = [];
    api.clearToken();
    localStorage.removeItem('inspector_session');
    route('login');
  }
}

// 모든 하자 목록 조회
async function loadAllDefects() {
  if (!InspectorState.session) return;
  
  setLoading(true);
  try {
    // 모든 케이스 조회
    const cases = await api.getCases();
    
    if (!cases || cases.length === 0) {
      $('#defect-list-container').innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
        </div>
      `;
      return;
    }
    
    // 각 케이스의 하자 조회
    const allDefects = [];
    for (const caseItem of cases) {
      try {
        const defects = await api.getDefects(caseItem.id);
        if (defects && defects.length > 0) {
          // 각 하자에 케이스 정보 추가
          defects.forEach(defect => {
            defect.case_id = caseItem.id;
            defect.case_type = caseItem.type;
            defect.case_created_at = caseItem.created_at;
          });
          allDefects.push(...defects);
        }
      } catch (error) {
        console.warn(`케이스 ${caseItem.id}의 하자 조회 실패:`, error);
      }
    }
    
    InspectorState.allDefects = allDefects;
    
    // 각 하자에 대한 측정값 조회
    const defectsWithInspections = await Promise.all(
      allDefects.map(async (defect) => {
        try {
          const inspections = await api.getDefectInspections(defect.id);
          return { ...defect, inspections: inspections.inspections || {} };
        } catch (error) {
          console.warn(`하자 ${defect.id}의 측정값 조회 실패:`, error);
          return { ...defect, inspections: {} };
        }
      })
    );
    
    // 하자목록 표시
    const container = $('#defect-list-container');
    if (!defectsWithInspections || defectsWithInspections.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
        </div>
      `;
    } else {
      container.innerHTML = defectsWithInspections.map(defect => {
        const hasInspections = Object.keys(defect.inspections || {}).length > 0;
        const inspectionSummary = hasInspections 
          ? Object.entries(defect.inspections).map(([type, items]) => {
              const typeNames = { air: '공기질', radon: '라돈', level: '레벨기', thermal: '열화상' };
              return `${typeNames[type] || type} ${items.length}건`;
            }).join(', ')
          : '';
        
        return `
          <div class="defect-card">
            <div class="defect-card-header">
              <div>
                <div class="defect-card-title">${escapeHTML(defect.location || '')} - ${escapeHTML(defect.trade || '')}</div>
                <div class="defect-card-meta">케이스: ${defect.case_id} | ${formatDate(defect.created_at)}</div>
              </div>
              ${hasInspections ? '<span class="inspection-badge">점검완료</span>' : '<span class="inspection-badge pending">점검대기</span>'}
            </div>
            <div class="defect-card-content">
              <div class="label">내용</div>
              <div class="value">${escapeHTML(defect.content || '')}</div>
              ${defect.memo ? `
                <div class="label">메모</div>
                <div class="value">${escapeHTML(defect.memo)}</div>
              ` : ''}
              ${hasInspections ? `
                <div class="label">점검결과</div>
                <div class="value" style="color: #10b981; font-size: 14px;">${inspectionSummary}</div>
              ` : ''}
              ${defect.photos && defect.photos.length > 0 ? `
                <div class="label">사진</div>
                <div class="gallery" style="display:flex;gap:8px;margin-top:4px;">
                  ${defect.photos.map(photo => `
                    <div class="thumb has-image" 
                         style="background-image:url('https://mobile-app-new.onrender.com${photo.url}');cursor:pointer;" 
                         onclick="showImageModal('https://mobile-app-new.onrender.com${photo.url}')">
                      ${photo.kind === 'near' ? '전체' : '근접'}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="hr"></div>
            <div class="button-group" style="display: flex; gap: 8px; margin-top: 12px;">
              <button class="button success" style="flex: 1;" onclick="openDefectInspection('${defect.id}', '${defect.case_id}')">
                📊 점검결과 입력
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
    
  } catch (error) {
    console.error('하자목록 조회 오류:', error);
    toast('하자목록을 불러오는데 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 점검결과 입력 화면 열기
async function openDefectInspection(defectId, caseId) {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  setLoading(true);
  try {
    InspectorState.currentDefectId = defectId;
    InspectorState.currentCaseId = caseId;
    
    // 하자 정보 조회
    const defect = await api.getDefect(defectId);
    
    // 하자 정보 표시
    const detailsEl = $('#defect-inspection-details');
    if (detailsEl) {
      detailsEl.innerHTML = `
        <div><strong>위치:</strong> ${escapeHTML(defect.location || '')}</div>
        <div><strong>세부공정:</strong> ${escapeHTML(defect.trade || '')}</div>
        <div><strong>내용:</strong> ${escapeHTML(defect.content || '')}</div>
      `;
    }
    
    // 첫 번째 탭으로 이동
    showDefectInspectionTab('air');
    
    route('defect-inspection');
    
  } catch (error) {
    console.error('하자 정보 조회 오류:', error);
    toast('하자 정보를 불러오는데 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 점검결과 입력 탭 전환
function showDefectInspectionTab(tabType) {
  document.querySelectorAll('#defect-inspection .equipment-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('#defect-inspection .equipment-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  const tabButton = document.querySelector(`#defect-inspection [onclick="showDefectInspectionTab('${tabType}')"]`);
  if (tabButton) {
    tabButton.classList.add('active');
  }
  
  const tabContent = document.getElementById(`defect-${tabType}-tab`);
  if (tabContent) {
    tabContent.classList.remove('hidden');
  }
}

// 점검결과 입력 폼 초기화
function resetDefectInspectionForm() {
  if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
    document.querySelectorAll('#defect-inspection input, #defect-inspection textarea, #defect-inspection select').forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    
    showDefectInspectionTab('air');
    toast('폼이 초기화되었습니다');
  }
}

// 점검결과 저장
async function saveDefectInspection() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  const defectId = InspectorState.currentDefectId;
  const caseId = InspectorState.currentCaseId;
  
  if (!defectId || !caseId) {
    toast('하자 정보가 없습니다', 'error');
    return;
  }
  
  const activeTab = document.querySelector('#defect-inspection .equipment-tab.active');
  if (!activeTab) {
    toast('측정 타입을 선택해주세요', 'error');
    return;
  }
  
  const tabType = activeTab.textContent.trim();
  setLoading(true);
  
  try {
    let response;
    
    if (tabType === '공기질') {
      const location = $('#defect-air-location').value.trim();
      const trade = $('#defect-air-trade').value.trim();
      const tvoc = $('#defect-air-tvoc').value;
      const hcho = $('#defect-air-hcho').value;
      const co2 = $('#defect-air-co2').value;
      const note = $('#defect-air-note').value.trim();
      const result = $('#defect-air-result').value;
      
      if (!location) {
        toast('위치를 입력해주세요', 'error');
        return;
      }
      
      response = await api.createAirMeasurementForDefect(
        caseId, defectId, location, trade,
        tvoc ? parseFloat(tvoc) : null,
        hcho ? parseFloat(hcho) : null,
        co2 ? parseFloat(co2) : null,
        note, result
      );
      
    } else if (tabType === '라돈') {
      const location = $('#defect-radon-location').value.trim();
      const trade = $('#defect-radon-trade').value.trim();
      const radon = $('#defect-radon-value').value;
      const unit = $('#defect-radon-unit').value;
      const note = $('#defect-radon-note').value.trim();
      const result = $('#defect-radon-result').value;
      
      if (!location || !radon) {
        toast('위치와 라돈 농도를 입력해주세요', 'error');
        return;
      }
      
      response = await api.createRadonMeasurementForDefect(
        caseId, defectId, location, trade,
        parseFloat(radon), unit, note, result
      );
      
    } else if (tabType === '레벨기') {
      const location = $('#defect-level-location').value.trim();
      const trade = $('#defect-level-trade').value.trim();
      const leftMm = $('#defect-level-left').value;
      const rightMm = $('#defect-level-right').value;
      const note = $('#defect-level-note').value.trim();
      const result = $('#defect-level-result').value;
      
      if (!location || !leftMm || !rightMm) {
        toast('위치와 좌우측 수치를 모두 입력해주세요', 'error');
        return;
      }
      
      response = await api.createLevelMeasurementForDefect(
        caseId, defectId, location, trade,
        parseFloat(leftMm), parseFloat(rightMm), note, result
      );
    } else {
      toast('잘못된 측정 타입입니다', 'error');
      return;
    }
    
    if (response && response.success) {
      toast('점검결과가 저장되었습니다', 'success');
      
      // 하자 목록 화면으로 돌아가서 갱신
      await loadAllDefects();
      route('defect-list');
      
    } else {
      toast('저장에 실패했습니다', 'error');
    }
    
  } catch (error) {
    console.error('점검결과 저장 오류:', error);
    toast(error.message || '저장에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 이미지 모달 표시 (간단한 구현)
function showImageModal(imageUrl) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center;';
  modal.innerHTML = `
    <img src="${imageUrl}" style="max-width: 90%; max-height: 90%; object-fit: contain;" />
    <button onclick="this.parentElement.remove()" style="position: absolute; top: 20px; right: 20px; background: white; border: none; padding: 10px 15px; border-radius: 50%; cursor: pointer; font-size: 20px;">✕</button>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// 보고서 미리보기
async function onPreviewReport() {
  if (isLoading) return;
  
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }

  setLoading(true);
  
  try {
    const reportData = await api.getReportPreview();
    const cont = $('#report-preview');
    cont.innerHTML = '';
    
    // PDF 버튼 그룹 요소 찾기
    const buttonGroup = document.querySelector('#report .button-group');
    
    // 케이스 ID 설정 (PDF 생성에 필요)
    if (reportData.case_id) {
      InspectorState.currentCaseId = reportData.case_id;
    }
    
    if (reportData.defects && reportData.defects.length > 0) {
      // 하자가 있는 경우: 버튼 표시
      if (buttonGroup) {
        buttonGroup.style.display = 'flex';
      }
      
      reportData.defects.forEach((d, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="font-weight:700;">${escapeHTML(d.location || '')} / ${escapeHTML(d.trade || '')}</div>
          <div class="small">${escapeHTML(d.content || '')}</div>
          ${d.memo ? `<div class="small" style="color: #666; margin-top: 4px;">메모: ${escapeHTML(d.memo)}</div>` : ''}
          ${d.photos && d.photos.length > 0 ? `
            <div class="gallery" style="margin-top:8px;">
              ${d.photos.map(photo => `
                <div class="thumb has-image" 
                     style="background-image:url('https://mobile-app-new.onrender.com${photo.url}');cursor:pointer;" 
                     onclick="showImageModal('https://mobile-app-new.onrender.com${photo.url}')">
                  ${photo.kind === 'near' ? '근접' : '원거리'}
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;
        cont.appendChild(card);
      });
    } else {
      // 하자가 없는 경우: 버튼 숨김
      if (buttonGroup) {
        buttonGroup.style.display = 'none';
      }
      
      cont.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
          <div style="color: #999; font-size: 12px; margin-top: 10px;">하자를 등록하면 PDF 보고서를 생성할 수 있습니다.</div>
        </div>
      `;
    }
    
    route('report');
    
  } catch (error) {
    console.error('보고서 미리보기 오류:', error);
    toast(error.message || '보고서 미리보기에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// PDF 미리보기
async function previewReportAsPdf() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  const caseId = InspectorState.currentCaseId;
  if (!caseId) {
    toast('케이스를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('PDF 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId);
    
    console.log('PDF 생성 결과:', generateResult);
    
    if (!generateResult || !generateResult.success) {
      const errorMsg = generateResult?.message || generateResult?.error || 'PDF 생성에 실패했습니다';
      throw new Error(errorMsg);
    }

    if (!generateResult.filename) {
      throw new Error('PDF 파일명을 받지 못했습니다. 서버 응답을 확인해주세요.');
    }

    toast('PDF 미리보기를 여는 중...', 'info');
    await api.previewReport(generateResult.filename);
    
    toast('PDF 미리보기 창이 열렸습니다', 'success');
    
  } catch (error) {
    console.error('PDF 미리보기 오류:', error);
    toast(error.message || 'PDF 미리보기에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// PDF 다운로드
async function downloadReportAsPdf() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  const caseId = InspectorState.currentCaseId;
  if (!caseId) {
    toast('케이스를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('PDF 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId);
    
    console.log('PDF 생성 결과:', generateResult);
    
    if (!generateResult || !generateResult.success) {
      const errorMsg = generateResult?.message || generateResult?.error || 'PDF 생성에 실패했습니다';
      throw new Error(errorMsg);
    }

    if (!generateResult.filename) {
      throw new Error('PDF 파일명을 받지 못했습니다. 서버 응답을 확인해주세요.');
    }

    toast('PDF 다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    
    toast('PDF 다운로드가 완료되었습니다', 'success');
    
  } catch (error) {
    console.error('PDF 다운로드 오류:', error);
    toast(error.message || 'PDF 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// SMS로 보고서 보내기
async function sendReportAsSMS() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  const caseId = InspectorState.currentCaseId;
  if (!caseId) {
    toast('케이스를 먼저 선택해주세요', 'error');
    return;
  }

  const phoneNumber = prompt('보고서를 받을 전화번호를 입력하세요 (예: 010-0000-0000)');
  if (!phoneNumber) return;
  
  setLoading(true);
  try {
    const result = await api.sendReport(caseId, phoneNumber);
    if (result.success) {
      toast('SMS로 보고서가 발송되었습니다', 'success');
    } else {
      throw new Error(result.message || '보고서 발송에 실패했습니다');
    }
  } catch (error) {
    console.error('보고서 발송 오류:', error);
    toast(error.message || '보고서 발송에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 앱 초기화
window.addEventListener('DOMContentLoaded', async () => {
  // 먼저 login 화면 표시
  $$('.screen').forEach(el => el.classList.add('hidden'));
  const loginScreen = $('#login');
  if (loginScreen) {
    loginScreen.classList.remove('hidden');
  }
  
  // 세션 복원 시도
  const savedSession = localStorage.getItem('inspector_session');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      if (session && session.token) {
        // 토큰 유효성 검증
        try {
          api.setToken(session.token);
          await api.getCases();
          
          // 토큰이 유효한 경우에만 세션 복원
          InspectorState.session = session;
          
          // 하자목록 로드
          await loadAllDefects();
          
          route('defect-list');
        } catch (error) {
          // 토큰이 만료되었거나 유효하지 않은 경우
          console.error('토큰이 만료되었거나 유효하지 않습니다:', error);
          localStorage.removeItem('inspector_session');
          api.clearToken();
          route('login');
        }
      } else {
        route('login');
      }
    } catch (error) {
      console.error('세션 복원 실패:', error);
      localStorage.removeItem('inspector_session');
      route('login');
    }
  } else {
    route('login');
  }
});

