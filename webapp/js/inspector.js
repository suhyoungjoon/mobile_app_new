// 점검원 전용 JavaScript
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// Inspector State
const InspectorState = {
  session: null,
  currentDefectId: null,
  currentCaseId: null,
  currentDefect: null, // 점검결과 입력 시 하자 정보 (육안 저장 시 location/trade 사용)
  allDefects: [],
  selectedHouseholdId: null,
  selectedHouseholdDisplay: null, // { complex_name, dong, ho, resident_name }
  userListCache: [], // loadUserList 결과 캐시 (selectUser에서 표시 정보 사용)
  measurementPhotos: {}, // 측정 타입별 사진 정보 {air: {file: File, url: string}, radon: {...}, level: {...}}
  inspectionByHousehold: false, // true면 세대별 점검(하자 무관), defectId 미사용
  householdInspections: null // getInspectionsByHousehold 결과 { visual: [], thermal: [], air: [], radon: [], level: [] }
};

// API Client는 api.js에서 전역 변수로 선언됨
// const api = new APIClient(); // api.js에서 이미 선언됨

// Loading state
let isLoading = false;

function setLoading(loading) {
  isLoading = loading;
  const buttons = $$('.button');
  buttons.forEach(btn => {
    // 로그아웃 버튼은 항상 활성화 유지
    if (btn.textContent.includes('로그아웃')) {
      return;
    }
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
    route(InspectorState.selectedHouseholdId ? 'defect-list' : 'user-list');
  }
}

function goBackToUserList() {
  navigationHistory.length = 0;
  route('user-list');
}

// 자동 로그인 (점검원 계정으로 자동 로그인)
async function autoLogin() {
  if (isLoading) {
    console.log('⚠️ 이미 로딩 중입니다');
    return;
  }
  
  console.log('🔐 자동 로그인 시작...');
  
  // 점검원 기본 정보 (admin complex)
  const complex = 'admin';
  const dong = '000';
  const ho = '000';
  const name = '점검원';
  const phone = '010-0000-0000';
  
  const container = $('#user-list-container');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #666;">점검원 계정으로 로그인 중...</div>
      </div>
    `;
  }
  
  try {
    console.log('📡 로그인 API 호출 중...', { complex, dong, ho, name, phone });
    const response = await api.login(complex, dong, ho, name, phone);
    console.log('✅ 로그인 성공:', response);
    
    InspectorState.session = {
      complex, dong, ho, name, phone,
      token: response.token,
      expires_at: response.expires_at
    };
    
    api.setToken(response.token);
    localStorage.setItem('inspector_session', JSON.stringify(InspectorState.session));
    console.log('💾 세션 저장 완료');
    
    // 하자목록 로드
    console.log('📋 하자목록 로드 시작...');
    console.log('🔍 loadAllDefects 함수 존재 여부:', typeof loadAllDefects);
    
    if (typeof loadUserList === 'function') {
      try {
        await loadUserList();
        console.log('✅ 사용자 목록 로드 완료');
      } catch (error) {
        console.error('❌ 사용자 목록 로드 실패:', error);
      }
    }
    
    console.log('✅ 자동 로그인 완료, 사용자 목록 화면으로 이동');
    route('user-list');
    
  } catch (error) {
    console.error('❌ 자동 로그인 오류:', error);
    console.error('에러 상세:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    toast('점검원 계정으로 자동 로그인에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
    
    // 에러 시에도 화면 표시
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #e74c3c;">로그인에 실패했습니다.</div>
          <div style="color: #999; font-size: 12px; margin-top: 8px;">${error.message || '알 수 없는 오류'}</div>
          <div style="color: #999; font-size: 12px; margin-top: 4px;">페이지를 새로고침해주세요.</div>
        </div>
      `;
    }
  }
}

// 로그아웃 (자동 재로그인)
function onLogout() {
  if (confirm('로그아웃하시겠습니까? (자동으로 다시 로그인됩니다)')) {
    InspectorState.session = null;
    InspectorState.allDefects = [];
    api.clearToken();
    localStorage.removeItem('inspector_session');
    // 자동으로 다시 로그인
    autoLogin();
  }
}

// 하자가 등록된 사용자(세대) 목록 조회 및 표시
async function loadUserList() {
  const container = $('#user-list-container');
  if (!container) return;
  container.innerHTML = `
    <div class="card" style="text-align: center; padding: 40px;">
      <div style="color: #666;">사용자 목록을 불러오는 중...</div>
    </div>
  `;
  try {
    const result = await api.getUsersWithDefects();
    const users = result.users || [];
    InspectorState.userListCache = users;
    if (users.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">하자가 등록된 사용자가 없습니다.</div>
          <div style="color: #999; font-size: 12px; margin-top: 8px;">일반 앱에서 하자를 등록하면 여기에 표시됩니다.</div>
        </div>
      `;
      return;
    }
    const baseUrl = api.baseURL.replace('/api', '');
    container.innerHTML = users.map((u) => `
      <div class="defect-card ${u.has_inspected ? 'has-inspected' : ''}">
        <div class="defect-card-header">
          <div class="defect-card-title">${escapeHTML(u.complex_name || '')} ${escapeHTML(u.dong || '')}동 ${escapeHTML(u.ho || '')}호</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${u.has_inspected ? '<span class="inspection-badge inspected">점검완료</span>' : ''}
            <span class="inspection-badge">하자 ${u.defect_count}건</span>
          </div>
        </div>
        <div class="defect-card-meta">${escapeHTML(u.resident_name || '')} · 하자 ${u.defect_count}건</div>
        <div class="button-group" style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <button class="button" style="flex: 1; min-width: 90px;" onclick="event.stopPropagation(); selectUser(${u.household_id})">하자목록 보기</button>
          <button class="button success" style="flex: 1; min-width: 90px;" onclick="event.stopPropagation(); openInspectionForHousehold(${u.household_id})">점검결과 입력</button>
          <button class="button" style="flex: 1; min-width: 90px;" onclick="event.stopPropagation(); previewReportForUser(${u.household_id})">보고서 미리보기</button>
          <button class="button" style="flex: 1; min-width: 90px;" onclick="event.stopPropagation(); downloadReportForUser(${u.household_id})">보고서 다운로드</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    const msg = (error && error.message) ? error.message : '사용자 목록을 불러오는데 실패했습니다';
    const isSessionInvalid = error.status === 403 || (msg && msg.includes('세대 정보를 찾을 수 없습니다'));
    if (isSessionInvalid) {
      InspectorState.session = null;
      try {
        localStorage.removeItem('inspector_session');
      } catch (e) {}
      toast(msg, 'error');
      throw error;
    }
    toast(msg, 'error');
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #e74c3c;">목록을 불러오는데 실패했습니다.</div>
        <div style="color: #999; font-size: 12px; margin-top: 8px;">${escapeHTML(msg)}</div>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">다시 로그인해주세요.</div>
      </div>
    `;
  }
}

// 사용자 선택 시 해당 세대의 하자목록 로드
function selectUser(householdId) {
  const u = InspectorState.userListCache.find((x) => x.household_id === householdId);
  InspectorState.selectedHouseholdId = householdId;
  InspectorState.selectedHouseholdDisplay = u ? {
    complex_name: u.complex_name,
    dong: u.dong,
    ho: u.ho,
    resident_name: u.resident_name
  } : null;
  const titleEl = $('#defect-list-title');
  if (titleEl) {
    const apt = (u && u.complex_name) ? `${u.complex_name} ` : '';
    titleEl.textContent = u ? `하자목록 - ${apt}${u.dong || ''}동 ${u.ho || ''}호` : '하자목록';
  }
  loadDefectsForHousehold(householdId);
  route('defect-list');
}

// 사용자 목록에서 해당 사용자 보고서 미리보기 (보고서 화면으로 이동)
async function previewReportForUser(householdId) {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  const u = InspectorState.userListCache.find((x) => x.household_id === householdId);
  InspectorState.selectedHouseholdId = householdId;
  InspectorState.selectedHouseholdDisplay = u ? { complex_name: u.complex_name, dong: u.dong, ho: u.ho, resident_name: u.resident_name } : null;
  setLoading(true);
  try {
    let reportData;
    try {
      reportData = await api.getReportPreview(householdId);
    } catch (e) {
      reportData = null;
    }
    if (reportData && reportData.case_id) InspectorState.currentCaseId = reportData.case_id;
    else if (InspectorState.selectedHouseholdId) {
      const defRes = await api.getDefectsByHousehold(InspectorState.selectedHouseholdId);
      if (defRes.defects && defRes.defects.length > 0) InspectorState.currentCaseId = defRes.defects[0].case_id;
    }
    const cont = $('#report-preview');
    const buttonGroup = document.querySelector('#report .button-group');
    if (buttonGroup) buttonGroup.style.display = 'flex';
    cont.innerHTML = '';
    const baseUrl = api.baseURL.replace('/api', '');
    const defects = reportData && reportData.defects != null
      ? (Array.isArray(reportData.defects) ? reportData.defects : [reportData.defects])
      : [];
    if (defects.length > 0) {
      defects.forEach((d) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="font-weight:700;">${escapeHTML(d.location || '')} / ${escapeHTML(d.trade || '')}</div>
          <div class="small">${escapeHTML(d.content || '')}</div>
          ${d.memo ? `<div class="small" style="color: #666; margin-top: 4px;">메모: ${escapeHTML(d.memo)}</div>` : ''}
          ${d.photos && d.photos.length > 0 ? `
            <div class="gallery" style="margin-top:8px;">
              ${d.photos.map((photo) => `
                <div class="thumb has-image" style="background-image:url('${baseUrl}${photo.url}');cursor:pointer;" onclick="showImageModal('${baseUrl}${photo.url}')">
                  ${photo.kind === 'near' ? '근접' : '원거리'}
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;
        cont.appendChild(card);
      });
    } else {
      cont.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">${defects.length === 0 ? '등록된 하자가 없습니다.' : '보고서 미리보기 데이터를 불러왔습니다.'}</div>
          <div style="color: #999; font-size: 12px; margin-top: 10px;">점검결과 유무와 관계없이 PDF 미리보기·다운로드를 이용할 수 있습니다.</div>
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

// 사용자 목록에서 해당 사용자 보고서 다운로드 (하자 없어도 PDF 생성 가능 — 세대 기준)
async function downloadReportForUser(householdId) {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  setLoading(true);
  try {
    let caseId = null;
    try {
      const reportData = await api.getReportPreview(householdId);
      caseId = reportData && reportData.case_id ? reportData.case_id : null;
    } catch (e) {
      console.warn('보고서 미리보기 조회 실패:', e);
    }
    if (!caseId) {
      const defRes = await api.getDefectsByHousehold(householdId);
      if (defRes.defects && defRes.defects.length > 0) caseId = defRes.defects[0].case_id;
    }
    toast('PDF 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId || null, householdId);
    if (!generateResult || !generateResult.success || !generateResult.filename) {
      throw new Error(generateResult?.message || generateResult?.error || 'PDF 생성에 실패했습니다');
    }
    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('보고서 다운로드가 완료되었습니다', 'success');
  } catch (error) {
    console.error('보고서 다운로드 오류:', error);
    toast(error.message || '보고서 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 직접 하자목록 조회 (fallback)
async function loadAllDefectsDirectly() {
  console.log('🔄 loadAllDefectsDirectly() 호출됨');
  const container = $('#defect-list-container');
  if (!container) {
    console.error('❌ container 요소를 찾을 수 없습니다');
    return;
  }
  
  container.innerHTML = `
    <div class="card" style="text-align: center; padding: 40px;">
      <div style="color: #666;">하자목록을 불러오는 중...</div>
    </div>
  `;
  
  try {
    // Admin API로 모든 하자 조회
    const baseURL = api.baseURL.replace('/api', '');
    const response = await fetch(`${baseURL}/api/admin/defects?limit=1000`, {
      headers: {
        'Authorization': `Bearer ${InspectorState.session.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Admin API 응답:', result);
    
    if (!result.defects || result.defects.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
        </div>
      `;
      return;
    }
    
    // 하자목록 표시
    InspectorState.allDefects = result.defects;
    if (result.defects.length > 0 && !InspectorState.currentCaseId) {
      InspectorState.currentCaseId = result.defects[0].case_id;
    }
    
    // 측정값 조회
    const defectsWithInspections = await Promise.all(
      result.defects.map(async (defect) => {
        try {
          const inspections = await api.getDefectInspections(defect.id);
          return { ...defect, inspections: inspections.inspections || {} };
        } catch (error) {
          return { ...defect, inspections: {} };
        }
      })
    );
    
    // 화면에 표시
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
          </div>
        </div>
      `;
    }).join('');
    
    console.log('✅ 하자목록 표시 완료:', defectsWithInspections.length, '개');
  } catch (error) {
    console.error('❌ 직접 하자목록 조회 실패:', error);
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #e74c3c;">하자목록을 불러오는데 실패했습니다.</div>
        <div style="color: #999; font-size: 12px; margin-top: 8px;">${error.message || '알 수 없는 오류'}</div>
      </div>
    `;
  }
}

// 선택한 사용자(세대)의 하자 목록 조회 (household_id 기준)
async function loadDefectsForHousehold(householdId) {
  const container = $('#defect-list-container');
  if (!container) return;
  if (!InspectorState.session) {
    container.innerHTML = '<div class="card" style="text-align: center; padding: 40px;"><div style="color: #666;">로그인이 필요합니다.</div></div>';
    return;
  }
  container.innerHTML = `
    <div class="card" style="text-align: center; padding: 40px;">
      <div style="color: #666;">하자목록을 불러오는 중...</div>
    </div>
  `;
  try {
    const result = await api.getDefectsByHousehold(householdId);
    const defects = result.defects || [];
    InspectorState.allDefects = defects;
    InspectorState.currentCaseId = defects.length > 0 ? defects[0].case_id : null;

    if (defects.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">이 사용자에게 등록된 하자가 없습니다.</div>
        </div>
      `;
      return;
    }

    const defectsWithInspections = await Promise.all(
      defects.map(async (defect) => {
        try {
          const inspections = await api.getDefectInspections(defect.id);
          return { ...defect, inspections: inspections.inspections || {} };
        } catch (error) {
          return { ...defect, inspections: {} };
        }
      })
    );

    const baseUrl = api.baseURL.replace('/api', '');
    container.innerHTML = defectsWithInspections.map((defect) => {
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
            ${defect.memo ? `<div class="label">메모</div><div class="value">${escapeHTML(defect.memo)}</div>` : ''}
            ${hasInspections ? `<div class="label">점검결과</div><div class="value" style="color: #10b981; font-size: 14px;">${inspectionSummary}</div>` : ''}
            ${defect.photos && defect.photos.length > 0 ? `
              <div class="label">사진</div>
              <div class="gallery" style="display:flex;gap:8px;margin-top:4px;">
                ${defect.photos.map((photo) => `
                  <div class="thumb has-image" style="background-image:url('${baseUrl}${photo.url}');cursor:pointer;" onclick="showImageModal('${baseUrl}${photo.url}')">
                    ${photo.kind === 'near' ? '전체' : '근접'}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('하자목록 조회 오류:', error);
    toast('하자목록을 불러오는데 실패했습니다', 'error');
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #e74c3c;">하자목록을 불러오는데 실패했습니다.</div>
        <div style="color: #999; font-size: 12px; margin-top: 8px;">페이지를 새로고침해주세요.</div>
      </div>
    `;
  }
}

// 모든 하자 목록 조회 (사용자 목록 진입 전 예전 방식 유지 - 세션 복원 시 user-list로 가므로 사용처 없을 수 있음)
async function loadAllDefects() {
  if (!InspectorState.session) return;
  await loadUserList();
  route('user-list');
}

// 하자 선택 모달 열기 (점검결과 입력 단일 버튼용)
function openDefectSelectModal() {
  const list = InspectorState.allDefects || [];
  if (list.length === 0) {
    toast('등록된 하자가 없습니다', 'error');
    return;
  }
  const modal = $('#defect-select-modal');
  const listEl = $('#defect-select-modal-list');
  if (!modal || !listEl) return;
  listEl.innerHTML = list.map((d) => `
    <div class="defect-card" style="margin-bottom:8px;">
      <div style="font-weight:700;">${escapeHTML(d.location || '')} - ${escapeHTML(d.trade || '')}</div>
      <div class="small" style="color:#666;margin-top:4px;">${escapeHTML((d.content || '').slice(0, 60))}${(d.content || '').length > 60 ? '…' : ''}</div>
      <button type="button" class="button success" style="width:100%;margin-top:8px;" onclick="closeDefectSelectModal(); openDefectInspection('${d.id}', '${d.case_id}')">선택</button>
    </div>
  `).join('');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}
function closeDefectSelectModal() {
  const modal = $('#defect-select-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// 세대(household)별 점검결과 입력 화면 열기 (하자 선택 없이, 타입별 N건 입력)
async function openInspectionForHousehold(householdId) {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  setLoading(true);
  try {
    InspectorState.inspectionByHousehold = true;
    InspectorState.selectedHouseholdId = householdId;
    InspectorState.currentDefectId = null;
    InspectorState.currentDefect = null;

    const u = InspectorState.userListCache.find((x) => x.household_id === householdId);
    InspectorState.selectedHouseholdDisplay = u ? {
      complex_name: u.complex_name,
      dong: u.dong,
      ho: u.ho,
      resident_name: u.resident_name
    } : null;

    const caseRes = await api.getCaseForHousehold(householdId);
    if (!caseRes || !caseRes.caseId) {
      toast('케이스 정보를 가져올 수 없습니다', 'error');
      return;
    }
    InspectorState.currentCaseId = caseRes.caseId;

    const defRes = await api.getDefectsByHousehold(householdId);
    InspectorState.allDefects = defRes.defects || [];

    const inspRes = await api.getInspectionsByHousehold(householdId);
    InspectorState.householdInspections = inspRes.inspections || { visual: [], thermal: [], air: [], radon: [], level: [] };

    const detailsEl = $('#defect-inspection-details');
    const d = InspectorState.selectedHouseholdDisplay;
    if (detailsEl) {
      detailsEl.innerHTML = d
        ? `<div><strong>${escapeHTML(d.complex_name || '')} ${d.dong || ''}동 ${d.ho || ''}호</strong></div><div>${escapeHTML(d.resident_name || '')}</div>`
        : `<div>세대 ID: ${householdId}</div>`;
    }

    const refBlock = $('#defect-inspection-defects-ref');
    const refList = $('#defect-inspection-defects-list');
    if (refBlock && refList) {
      if (InspectorState.allDefects.length > 0) {
        refBlock.style.display = 'block';
        refList.innerHTML = InspectorState.allDefects.map((d) => `
          <div class="defect-card" style="margin-bottom:8px;">
            <div style="font-weight:700;">${escapeHTML(d.location || '')} - ${escapeHTML(d.trade || '')}</div>
            <div class="small" style="color:#666;">${escapeHTML((d.content || '').slice(0, 80))}${(d.content || '').length > 80 ? '…' : ''}</div>
          </div>
        `).join('');
      } else {
        refBlock.style.display = 'none';
      }
    }

    const visualSummaryEl = $('#defect-visual-defect-summary');
    if (visualSummaryEl) {
      visualSummaryEl.innerHTML = InspectorState.allDefects.length > 0
        ? '세대주가 등록한 하자는 위 "세대주 등록 하자 (참고용)"에서 확인할 수 있습니다.'
        : '등록된 하자가 없습니다. 점검결과만 입력합니다.';
    }
    const visualNoteEl = $('#defect-visual-note');
    if (visualNoteEl) visualNoteEl.value = '';

    clearInspectionFormFieldsOnly();
    showDefectInspectionTab('visual');
    route('defect-inspection');
  } catch (error) {
    console.error('점검결과 입력 화면 열기 오류:', error);
    toast(error.message || '화면을 열 수 없습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 점검결과 입력 화면 열기 (기존: 하자 선택 후)
async function openDefectInspection(defectId, caseId) {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  InspectorState.inspectionByHousehold = false;
  setLoading(true);
  try {
    InspectorState.currentDefectId = defectId;
    InspectorState.currentCaseId = caseId;
    
    // 하자 정보 조회
    const defect = await api.getDefect(defectId);
    
    InspectorState.currentDefect = defect;

    // 하자 정보 표시
    const detailsEl = $('#defect-inspection-details');
    if (detailsEl) {
      detailsEl.innerHTML = `
        <div><strong>위치:</strong> ${escapeHTML(defect.location || '')}</div>
        <div><strong>세부공정:</strong> ${escapeHTML(defect.trade || '')}</div>
        <div><strong>내용:</strong> ${escapeHTML(defect.content || '')}</div>
      `;
    }

    // 육안 탭용 요약 + 기존 육안 점검의견 로드
    const visualSummaryEl = $('#defect-visual-defect-summary');
    if (visualSummaryEl) {
      visualSummaryEl.innerHTML = `
        <div><strong>위치:</strong> ${escapeHTML(defect.location || '-')}</div>
        <div><strong>공종:</strong> ${escapeHTML(defect.trade || '-')}</div>
        <div><strong>내용:</strong> ${escapeHTML(defect.content || '-')}</div>
        <div><strong>메모:</strong> ${escapeHTML(defect.memo || '-')}</div>
      `;
    }
    const visualNoteEl = $('#defect-visual-note');
    if (visualNoteEl) visualNoteEl.value = '';
    try {
      const inspRes = await api.getDefectInspections(defectId);
      if (inspRes && inspRes.inspections && inspRes.inspections.visual && inspRes.inspections.visual.length > 0) {
        const latest = inspRes.inspections.visual[inspRes.inspections.visual.length - 1];
        if (latest.note && visualNoteEl) visualNoteEl.value = latest.note;
      }
    } catch (_) { /* 무시 */ }
    
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

// 이미지 압축 함수 (app.js의 compressImage 복사)
async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      
      img.onload = () => {
        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;
          
          if (originalWidth > maxWidth || originalHeight > maxHeight) {
            const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
            targetWidth = Math.round(originalWidth * ratio);
            targetHeight = Math.round(originalHeight * ratio);
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('이미지 압축 실패'));
                return;
              }
              
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }
              );
              
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

// 측정값 사진 업로드 처리
async function handleMeasurementPhotoUpload(type, inputElement) {
  const file = inputElement.files[0];
  if (!file) {
    return;
  }
  
  // 이미지 파일 검증
  if (!file.type.startsWith('image/')) {
    toast('이미지 파일만 업로드 가능합니다', 'error');
    return;
  }
  
  // 파일 크기 검증 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast('파일 크기는 10MB 이하여야 합니다', 'error');
    return;
  }
  
  try {
    toast('사진 처리 중...', 'info');
    
    // 파일 미리보기
    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewElement = $(`#defect-${type}-photo-preview`);
      if (previewElement) {
        previewElement.style.backgroundImage = `url(${e.target.result})`;
        previewElement.style.display = 'block';
      }
      
      try {
        // 이미지 압축
        const compressedFile = await compressImage(file, 1920, 1080, 0.85);
        
        // 서버에 압축된 사진 업로드
        const uploadResult = await api.uploadImage(compressedFile);
        
        // InspectorState에 사진 정보 저장
        InspectorState.measurementPhotos[type] = {
          file: compressedFile,
          url: uploadResult.url || `/uploads/${uploadResult.key || uploadResult.filename}`,
          key: uploadResult.key || uploadResult.filename
        };
        
        toast('사진 업로드 완료!', 'success');
      } catch (error) {
        console.error('사진 업로드 실패:', error);
        toast(error.message || '사진 업로드 실패', 'error');
        if (previewElement) {
          previewElement.style.backgroundImage = '';
          previewElement.style.display = 'none';
        }
      }
    };
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('사진 처리 실패:', error);
    toast('사진 처리 중 오류가 발생했습니다', 'error');
  }
}

// 점검결과 입력 폼만 초기화 (확인 없이, 저장 후 추가 입력용)
function clearInspectionFormFieldsOnly() {
  document.querySelectorAll('#defect-inspection input, #defect-inspection textarea, #defect-inspection select').forEach((input) => {
    if (input.type === 'checkbox') input.checked = false;
    else input.value = input.id && input.id.includes('reference') ? '150' : '';
  });
  ['air', 'radon', 'level', 'thermal'].forEach((type) => {
    const preview = $(`#defect-${type}-photo-preview`);
    const input = $(`#defect-${type}-photo`);
    if (preview) { preview.style.backgroundImage = ''; preview.style.display = 'none'; }
    if (input) input.value = '';
  });
  InspectorState.measurementPhotos = {};
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
    
    // 사진 미리보기 초기화
    ['air', 'radon', 'level', 'thermal'].forEach(type => {
      const previewElement = $(`#defect-${type}-photo-preview`);
      const inputElement = $(`#defect-${type}-photo`);
      if (previewElement) {
        previewElement.style.backgroundImage = '';
        previewElement.style.display = 'none';
      }
      if (inputElement) {
        inputElement.value = '';
      }
    });
    
    // InspectorState 사진 정보 초기화
    InspectorState.measurementPhotos = {};
    
    const refInput = $('#defect-level-reference');
    if (refInput) refInput.value = '150';
    const visualNoteInput = $('#defect-visual-note');
    if (visualNoteInput) visualNoteInput.value = '';
    
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

  const byHousehold = InspectorState.inspectionByHousehold;
  const defectId = byHousehold ? null : InspectorState.currentDefectId;
  const caseId = InspectorState.currentCaseId;

  if (!caseId) {
    toast('케이스 정보가 없습니다', 'error');
    return;
  }
  if (!byHousehold && !defectId) {
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
      const processType = $('#defect-air-process-type').value || null;
      const tvoc = $('#defect-air-tvoc').value;
      const hcho = $('#defect-air-hcho').value;
      const co2 = $('#defect-air-co2').value;
      const note = $('#defect-air-note').value.trim();
      const result = $('#defect-air-result').value;
      
      if (!location) {
        toast('위치를 입력해주세요', 'error');
        return;
      }
      
      if (byHousehold) {
        response = await api.request('/inspections/air', {
          method: 'POST',
          body: JSON.stringify({
            caseId, location, trade, process_type: processType || null,
            tvoc: tvoc ? parseFloat(tvoc) : null,
            hcho: hcho ? parseFloat(hcho) : null,
            co2: co2 ? parseFloat(co2) : null,
            note, result
          })
        });
      } else {
        response = await api.createAirMeasurementForDefect(
          caseId, defectId, location, trade,
          tvoc ? parseFloat(tvoc) : null,
          hcho ? parseFloat(hcho) : null,
          co2 ? parseFloat(co2) : null,
          note, result, processType
        );
      }
      
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

      if (byHousehold) {
        response = await api.createRadonMeasurement(caseId, location, trade, parseFloat(radon), unit, note, result);
      } else {
        response = await api.createRadonMeasurementForDefect(
          caseId, defectId, location, trade,
          parseFloat(radon), unit, note, result
        );
      }
      
    } else if (tabType === '레벨기') {
      const location = $('#defect-level-location').value.trim();
      const trade = $('#defect-level-trade').value.trim();
      const referenceMm = $('#defect-level-reference').value;
      const p1l = $('#defect-level-p1-left').value;
      const p1r = $('#defect-level-p1-right').value;
      const p2l = $('#defect-level-p2-left').value;
      const p2r = $('#defect-level-p2-right').value;
      const p3l = $('#defect-level-p3-left').value;
      const p3r = $('#defect-level-p3-right').value;
      const p4l = $('#defect-level-p4-left').value;
      const p4r = $('#defect-level-p4-right').value;
      const note = $('#defect-level-note').value.trim();
      const result = $('#defect-level-result').value;
      
      const levelPoints = {
        reference_mm: referenceMm ? parseFloat(referenceMm) : 150,
        p1_left: p1l === '' ? null : parseFloat(p1l),
        p1_right: p1r === '' ? null : parseFloat(p1r),
        p2_left: p2l === '' ? null : parseFloat(p2l),
        p2_right: p2r === '' ? null : parseFloat(p2r),
        p3_left: p3l === '' ? null : parseFloat(p3l),
        p3_right: p3r === '' ? null : parseFloat(p3r),
        p4_left: p4l === '' ? null : parseFloat(p4l),
        p4_right: p4r === '' ? null : parseFloat(p4r)
      };
      const hasAny = [p1l, p1r, p2l, p2r, p3l, p3r, p4l, p4r].some(v => v !== '');
      
      if (!location) {
        toast('위치를 입력해주세요', 'error');
        return;
      }
      if (!hasAny) {
        toast('4개 측정점 중 최소 1개 이상 좌/우 값을 입력해주세요', 'error');
        return;
      }

      if (byHousehold) {
        const body = {
          caseId, location, trade, note, result,
          reference_mm: levelPoints.reference_mm,
          point1_left_mm: levelPoints.p1_left, point1_right_mm: levelPoints.p1_right,
          point2_left_mm: levelPoints.p2_left, point2_right_mm: levelPoints.p2_right,
          point3_left_mm: levelPoints.p3_left, point3_right_mm: levelPoints.p3_right,
          point4_left_mm: levelPoints.p4_left, point4_right_mm: levelPoints.p4_right
        };
        response = await api.request('/inspections/level', { method: 'POST', body: JSON.stringify(body) });
      } else {
        response = await api.createLevelMeasurementForDefect(
          caseId, defectId, location, trade, levelPoints, note, result
        );
      }
      
    } else if (tabType === '열화상') {
      const location = $('#defect-thermal-location').value.trim();
      const note = $('#defect-thermal-note').value.trim();
      
      if (!location) {
        toast('위치를 입력해주세요', 'error');
        return;
      }
      
      if (!note) {
        toast('점검내용을 입력해주세요', 'error');
        return;
      }

      if (byHousehold) {
        response = await api.createThermalInspection(caseId, null, location, '', note, 'normal');
      } else {
        response = await api.createThermalInspectionForDefect(
          caseId, defectId, location, '', note, 'normal'
        );
      }
      
    } else if (tabType === '육안') {
      const note = $('#defect-visual-note').value.trim();
      const defect = InspectorState.currentDefect || {};
      const location = (defect.location && defect.location.trim()) || '육안';
      const trade = (defect.trade && defect.trade.trim()) || null;
      if (byHousehold) {
        response = await api.createVisualInspectionForDefect(caseId, null, note, '육안', null);
      } else {
        response = await api.createVisualInspectionForDefect(caseId, defectId, note, location, trade);
      }
      
    } else {
      toast('잘못된 측정 타입입니다', 'error');
      return;
    }
    
    if (response && response.success) {
      // 측정값 저장 성공 후 사진 업로드 (사진이 있는 경우, 육안은 사진 없음)
      const measurementType = tabType === '공기질' ? 'air' : 
                             tabType === '라돈' ? 'radon' : 
                             tabType === '레벨기' ? 'level' : 
                             tabType === '열화상' ? 'thermal' : null;
      const photoData = measurementType ? InspectorState.measurementPhotos[measurementType] : null;
      
      if (photoData && response.item && response.item.id) {
        try {
          // 사진 업로드 API 호출 (thermal_photo 테이블 사용)
          await api.uploadThermalPhoto(response.item.id, photoData.url, `측정값 사진`);
          console.log('✅ 측정값 사진 업로드 완료');
        } catch (photoError) {
          console.error('⚠️ 측정값 사진 업로드 실패:', photoError);
          // 사진 업로드 실패는 무시하고 계속 진행
        }
      }
      
      // 사진 정보 초기화
      if (measurementType) {
        InspectorState.measurementPhotos[measurementType] = null;
      }
      
      toast('점검결과가 저장되었습니다', 'success');

      if (InspectorState.inspectionByHousehold && InspectorState.selectedHouseholdId) {
        const inspRes = await api.getInspectionsByHousehold(InspectorState.selectedHouseholdId);
        InspectorState.householdInspections = inspRes.inspections || { visual: [], thermal: [], air: [], radon: [], level: [] };
        clearInspectionFormFieldsOnly();
      } else if (InspectorState.selectedHouseholdId) {
        await loadDefectsForHousehold(InspectorState.selectedHouseholdId);
        route('defect-list');
      } else {
        route('defect-list');
      }
      
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

  if (!InspectorState.selectedHouseholdId) {
    toast('사용자를 먼저 선택해주세요', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    const reportData = await api.getReportPreview(InspectorState.selectedHouseholdId, InspectorState.currentCaseId);
    const cont = $('#report-preview');
    cont.innerHTML = '';
    
    // PDF 버튼 그룹 요소 찾기
    const buttonGroup = document.querySelector('#report .button-group');
    
    // 케이스 ID 설정 (PDF 생성에 필요)
    if (reportData.case_id) {
      InspectorState.currentCaseId = reportData.case_id;
    }
    
    const defects = reportData.defects != null
      ? (Array.isArray(reportData.defects) ? reportData.defects : [reportData.defects])
      : [];
    if (defects.length > 0) {
      // 하자가 있는 경우: 버튼 표시
      if (buttonGroup) {
        buttonGroup.style.display = 'flex';
      }
      
      const baseUrl = api.baseURL.replace('/api', '');
      defects.forEach((d, index) => {
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
                     style="background-image:url('${baseUrl}${photo.url}');cursor:pointer;" 
                     onclick="showImageModal('${baseUrl}${photo.url}')">
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

  const householdId = InspectorState.selectedHouseholdId;
  setLoading(true);
  try {
    toast('PDF 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId, householdId);
    
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
  const householdId = InspectorState.selectedHouseholdId;
  if (!householdId) {
    toast('대상 세대를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('PDF 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId, householdId);
    
    if (!generateResult || !generateResult.success) {
      const errorMsg = generateResult?.message || generateResult?.error || 'PDF 생성에 실패했습니다';
      throw new Error(errorMsg);
    }
    if (!generateResult.filename) throw new Error('PDF 파일명을 받지 못했습니다.');

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

// 최종보고서 다운로드 (템플릿 PDF + 점검결과 치환)
async function downloadFinalReportAsPdf() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  const householdId = InspectorState.selectedHouseholdId;
  if (!householdId) {
    toast('대상 세대를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('최종보고서 생성 중...', 'info');
    const generateResult = await api.generateReport(InspectorState.currentCaseId, householdId, { template: 'final-report' });
    if (!generateResult || !generateResult.success) {
      throw new Error(generateResult?.message || generateResult?.error || '최종보고서 생성에 실패했습니다');
    }
    if (!generateResult.filename) throw new Error('파일명을 받지 못했습니다.');

    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('최종보고서 다운로드가 완료되었습니다', 'success');
  } catch (error) {
    console.error('최종보고서 다운로드 오류:', error);
    toast(error.message || '최종보고서 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 수기보고서 다운로드 (세대별 하자 리스트: 하자위치 | 공종 | 내용 | 특이사항 | 사진파일)
async function downloadSummaryReportAsPdf() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  const householdId = InspectorState.selectedHouseholdId;
  if (!householdId) {
    toast('대상 세대를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('수기보고서 생성 중...', 'info');
    const generateResult = await api.generateReport(InspectorState.currentCaseId, householdId, { template: 'summary-report' });
    if (!generateResult || !generateResult.success) {
      throw new Error(generateResult?.message || generateResult?.error || '수기보고서 생성에 실패했습니다');
    }
    if (!generateResult.filename) throw new Error('파일명을 받지 못했습니다.');

    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('수기보고서 다운로드가 완료되었습니다', 'success');
  } catch (error) {
    console.error('수기보고서 다운로드 오류:', error);
    toast(error.message || '수기보고서 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 점검결과 양식 다운로드 (1p 세대주, 2p~ 육안/열화상/공기질/레벨기)
async function downloadInspectionFormAsPdf() {
  if (!InspectorState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  const householdId = InspectorState.selectedHouseholdId;
  if (!householdId) {
    toast('대상 세대를 먼저 선택해주세요', 'error');
    return;
  }

  setLoading(true);
  try {
    toast('점검결과 양식 생성 중...', 'info');
    const generateResult = await api.generateReport(InspectorState.currentCaseId, householdId, { template: 'inspection-form' });
    if (!generateResult || !generateResult.success) {
      throw new Error(generateResult?.message || generateResult?.error || '점검결과 양식 생성에 실패했습니다');
    }
    if (!generateResult.filename) throw new Error('파일명을 받지 못했습니다.');

    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('점검결과 양식 다운로드가 완료되었습니다', 'success');
  } catch (error) {
    console.error('점검결과 양식 다운로드 오류:', error);
    toast(error.message || '점검결과 양식 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 앱 초기화
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 점검원 화면 초기화 시작');
  
  // API 클라이언트 확인
  if (typeof api === 'undefined') {
    console.error('❌ API 클라이언트가 로드되지 않았습니다. api.js가 먼저 로드되어야 합니다.');
    return;
  }
  console.log('✅ API 클라이언트 확인 완료');
  
  // 모든 화면 숨기기
  $$('.screen').forEach(el => el.classList.add('hidden'));
  
  // 먼저 사용자 목록 화면 표시 (로딩 중에도 화면이 보이도록)
  const userListScreen = $('#user-list');
  if (userListScreen) {
    userListScreen.classList.remove('hidden');
    console.log('✅ 사용자 목록 화면 표시');
  } else {
    console.error('❌ 사용자 목록 화면을 찾을 수 없습니다');
  }
  
  const container = $('#user-list-container');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #666;">점검원 계정으로 로그인 중...</div>
        <div style="color: #999; font-size: 12px; margin-top: 8px;">잠시만 기다려주세요</div>
      </div>
    `;
  }
  
  // 세션 복원 시도
  const savedSession = localStorage.getItem('inspector_session');
  console.log('💾 저장된 세션 확인:', savedSession ? '있음' : '없음');
  
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      if (session && session.token) {
        console.log('🔄 저장된 세션 발견, 토큰 유효성 검증 중...');
        // 토큰 유효성 검증
        try {
          api.setToken(session.token);
          console.log('📡 케이스 목록 조회 API 호출 중...');
          await api.getCases();
          
          // 토큰이 유효한 경우에만 세션 복원
          console.log('✅ 토큰 유효성 확인 완료, 세션 복원 중...');
          InspectorState.session = session;
          
          console.log('📋 사용자 목록 로드 시작...');
          await loadUserList();
          
          console.log('✅ 세션 복원 완료, 사용자 목록 화면으로 이동');
          route('user-list');
          return; // 성공 시 여기서 종료
        } catch (error) {
          // 토큰이 만료되었거나 유효하지 않은 경우
          console.error('❌ 토큰이 만료되었거나 유효하지 않습니다:', error);
          localStorage.removeItem('inspector_session');
          api.clearToken();
          // 자동 로그인 시도
          console.log('🔄 자동 로그인 시도...');
          await autoLogin();
          return;
        }
      } else {
        console.log('⚠️ 저장된 세션에 토큰이 없습니다');
      }
    } catch (error) {
      console.error('❌ 세션 복원 실패:', error);
      localStorage.removeItem('inspector_session');
    }
  }
  
  // 세션이 없거나 복원 실패 시 자동 로그인
  console.log('🔄 자동 로그인 시작...');
  await autoLogin();
  console.log('✅ 초기화 완료');
});

