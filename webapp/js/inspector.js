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
  measurementPhotos: {}, // 측정 타입별 사진 최대 2장 {air: [{url, file, key}, ...], visual: [...], ...}
  inspectionByHousehold: false, // true면 세대별 점검(하자 무관), defectId 미사용
  householdInspections: null, // getInspectionsByHousehold 결과 { visual: [], thermal: [], air: [], radon: [], level: [] }
  _editReplacementPhotos: {} // 수정 모달에서 교체할 사진 { photoId: { url, sort_order } }
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
    var detailMsg = error.details || error.message || '알 수 없는 오류';
    if (error.details == null && error.responseText) {
      try {
        var body = JSON.parse(error.responseText);
        detailMsg = body.details || body.detail || body.error || detailMsg;
      } catch (_) {
        detailMsg = (error.responseText || '').slice(0, 200) || detailMsg;
      }
      console.error('서버 응답 본문:', error.responseText);
    }
    console.error('❌ 자동 로그인 오류:', error);
    console.error('에러 상세:', { message: error.message, details: error.details, detailMsg: detailMsg });
    toast('점검원 계정으로 자동 로그인에 실패했습니다: ' + detailMsg, 'error');
    
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #e74c3c;">로그인에 실패했습니다.</div>
          <div style="color: #666; font-size: 13px; margin-top: 12px; word-break: break-all;">${escapeHTML(detailMsg)}</div>
          <div style="color: #999; font-size: 12px; margin-top: 8px;">백엔드 터미널에서 "❌ /api/auth/session error" 로그를 확인하세요.</div>
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
        <div class="defect-card-actions">
          <button class="button button-cta" onclick="event.stopPropagation(); selectUser(${u.household_id})">하자목록 보기</button>
          <button class="button success button-cta" onclick="event.stopPropagation(); openInspectionForHousehold(${u.household_id})">점검결과 입력</button>
          <button class="button button-cta" onclick="event.stopPropagation(); previewReportForUser(${u.household_id})">보고서 미리보기</button>
          <button class="button button-cta" onclick="event.stopPropagation(); downloadReportForUser(${u.household_id})">보고서 다운로드</button>
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
              ${d.photos.map((photo) => {
                const raw = photo.url || photo.file_url || '';
                const fullUrl = raw.startsWith('http') ? raw : (baseUrl + raw);
                return fullUrl ? `<div class="thumb has-image" style="background-image:url('${fullUrl}');cursor:pointer;" onclick="showImageModal('${fullUrl}')">${photo.kind === 'near' ? '근접' : '원거리'}</div>` : '';
              }).filter(Boolean).join('')}
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
    toast('최종보고서 생성 중...', 'info');
    const generateResult = await api.generateReport(caseId || null, householdId, { template: 'final-report' });
    if (!generateResult || !generateResult.success || !generateResult.filename) {
      throw new Error(generateResult?.message || generateResult?.error || '최종보고서 생성에 실패했습니다');
    }
    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('최종보고서 다운로드가 완료되었습니다', 'success');
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
    
    const baseUrl = (api.baseURL || '').replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
    const toFullUrl = (raw) => {
      if (!raw || typeof raw !== 'string') return '';
      const s = String(raw).trim();
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      const path = s.startsWith('/') ? s : '/' + s;
      return baseUrl ? baseUrl + path : s;
    };
    const buildPhotos = (d) => {
      const list = d.photos && Array.isArray(d.photos) ? d.photos : [];
      if (list.length > 0) return list;
      const out = [];
      if (d.photo_near) out.push({ url: d.photo_near, kind: 'near' });
      if (d.photo_far) out.push({ url: d.photo_far, kind: 'far' });
      return out;
    };
    const renderPhotos = (defect) => {
      const arr = buildPhotos(defect || {});
      if (arr.length === 0) return '';
      const thumbs = arr.map((p) => {
        const raw = p.url || p.file_url || '';
        const fullUrl = toFullUrl(raw);
        if (!fullUrl) return '';
        const safe = (s) => String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const label = p.kind === 'near' ? '전체' : (p.kind === 'far' ? '근접' : '사진');
        return `<span style="display:inline-block;width:48px;height:48px;background:#e5e7eb;border-radius:8px;overflow:hidden;margin:2px;"><img src="${safe(fullUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="showImageModal('${safe(fullUrl)}')" title="${label}" onerror="this.style.display='none'" referrerpolicy="no-referrer" /></span>`;
      }).filter(Boolean).join('');
      return thumbs ? `<div class="label">사진</div><div class="gallery" style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">${thumbs}</div>` : '';
    };
    container.innerHTML = result.defects.map((defect) => `
      <div class="defect-card">
        <div class="defect-card-header">
          <div>
            <div class="defect-card-title">${escapeHTML(defect.location || '')} - ${escapeHTML(defect.trade || '')}</div>
            <div class="defect-card-meta">케이스: ${defect.case_id} | ${formatDate(defect.created_at)}</div>
          </div>
        </div>
        <div class="defect-card-content">
          <div class="label">내용</div>
          <div class="value">${escapeHTML(defect.content || '')}</div>
          ${defect.memo ? `
            <div class="label">메모</div>
            <div class="value">${escapeHTML(defect.memo)}</div>
          ` : ''}
          ${renderPhotos(defect)}
        </div>
      </div>
    `).join('');

    console.log('✅ 하자목록 표시 완료:', result.defects.length, '개');
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

    const baseUrl = (api.baseURL || '').replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
    const toFullUrl = (raw) => {
      if (!raw || typeof raw !== 'string') return '';
      const s = String(raw).trim();
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      const path = s.startsWith('/') ? s : '/' + s;
      return baseUrl ? baseUrl + path : s;
    };
    const buildPhotos = (d) => {
      const list = d.photos && Array.isArray(d.photos) ? d.photos : [];
      if (list.length > 0) return list;
      const out = [];
      if (d.photo_near) out.push({ url: d.photo_near, kind: 'near' });
      if (d.photo_far) out.push({ url: d.photo_far, kind: 'far' });
      return out;
    };
    const renderPhotos = (defect) => {
      const arr = buildPhotos(defect || {});
      if (arr.length === 0) return '';
      const thumbs = arr.map((p) => {
        const raw = p.url || p.file_url || '';
        const fullUrl = toFullUrl(raw);
        if (!fullUrl) return '';
        const safe = (s) => String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const label = p.kind === 'near' ? '전체' : (p.kind === 'far' ? '근접' : '사진');
        return `<span style="display:inline-block;width:48px;height:48px;background:#e5e7eb;border-radius:8px;overflow:hidden;margin:2px;"><img src="${safe(fullUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="showImageModal('${safe(fullUrl)}')" title="${label}" onerror="this.style.display='none'" referrerpolicy="no-referrer" /></span>`;
      }).filter(Boolean).join('');
      return thumbs ? `<div class="label">사진</div><div class="gallery" style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">${thumbs}</div>` : '';
    };
    container.innerHTML = defects.map((defect) => `
      <div class="defect-card">
        <div class="defect-card-header">
          <div>
            <div class="defect-card-title">${escapeHTML(defect.location || '')} - ${escapeHTML(defect.trade || '')}</div>
            <div class="defect-card-meta">케이스: ${defect.case_id} | ${formatDate(defect.created_at)}</div>
          </div>
        </div>
        <div class="defect-card-content">
          <div class="label">내용</div>
          <div class="value">${escapeHTML(defect.content || '')}</div>
          ${defect.memo ? `<div class="label">메모</div><div class="value">${escapeHTML(defect.memo)}</div>` : ''}
          ${renderPhotos(defect)}
        </div>
      </div>
    `).join('');
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
      <button type="button" class="button success button-cta" style="width:100%;margin-top:8px;" onclick="closeDefectSelectModal(); openDefectInspection('${d.id}', '${d.case_id}')">선택</button>
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

// 점검결과 수정 모달
let _editingInspectionId = null;
let _editingInspectionType = null;
let _detailModalDefectId = null; // 상세 모달이 하자 기준으로 열렸을 때만 설정

function closeInspectionDetailModal() {
  _detailModalDefectId = null;
  const modal = $('#inspection-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function closeInspectionEditModal() {
  _editingInspectionId = null;
  _editingInspectionType = null;
  InspectorState._editReplacementPhotos = {};
  const modal = $('#inspection-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function buildInspectionEditForm(type, item) {
  const v = (x) => (x != null && x !== '' ? String(x) : '');
  const lv = (key) => { const x = item[key] ?? (item.level_measure && item.level_measure[key]); return v(x); };
  const typeNames = { visual: '육안', air: '공기질', radon: '라돈', level: '레벨기', thermal: '열화상' };
  let html = `<input type="hidden" id="ins-edit-type" value="${escapeHTML(type)}" />`;
  html += `<div class="form-group"><label class="form-label">위치</label><input type="text" id="ins-edit-location" class="input" value="${escapeHTML(v(item.location))}" /></div>`;
  html += `<div class="form-group"><label class="form-label">공종</label><input type="text" id="ins-edit-trade" class="input" value="${escapeHTML(v(item.trade))}" /></div>`;
  html += `<div class="form-group"><label class="form-label">메모</label><textarea id="ins-edit-note" class="input" rows="2">${escapeHTML(v(item.note))}</textarea></div>`;
  html += `<div class="form-group"><label class="form-label">결과</label><select id="ins-edit-result" class="input"><option value="normal" ${(item.result === 'normal' || item.result_text === '정상') ? 'selected' : ''}>정상</option><option value="check" ${(item.result === 'check' || item.result_text === '확인요망') ? 'selected' : ''}>확인요망</option><option value="na" ${(item.result === 'na' || item.result_text === '해당없음') ? 'selected' : ''}>해당없음</option></select></div>`;
  if (type === 'air') {
    html += `<div class="form-group"><label class="form-label">유형</label><select id="ins-edit-process_type" class="input"><option value="">-</option><option value="flush_out" ${item.process_type === 'flush_out' ? 'selected' : ''}>Flush-out</option><option value="bake_out" ${item.process_type === 'bake_out' ? 'selected' : ''}>Bake-out</option></select></div>`;
    html += `<div class="form-group"><label class="form-label">TVOC</label><input type="text" id="ins-edit-tvoc" class="input" value="${v(item.tvoc)}" placeholder="숫자" /></div>`;
    html += `<div class="form-group"><label class="form-label">HCHO</label><input type="text" id="ins-edit-hcho" class="input" value="${v(item.hcho)}" placeholder="숫자" /></div>`;
  }
  if (type === 'radon') {
    html += `<div class="form-group"><label class="form-label">라돈 값</label><input type="text" id="ins-edit-radon" class="input" value="${v(item.radon)}" /></div>`;
    html += `<div class="form-group"><label class="form-label">단위</label><select id="ins-edit-unit_radon" class="input"><option value="Bq/m³" ${(item.unit_radon || item.unit) === 'Bq/m³' ? 'selected' : ''}>Bq/m³</option><option value="pCi/L" ${(item.unit_radon || item.unit) === 'pCi/L' ? 'selected' : ''}>pCi/L</option></select></div>`;
  }
  if (type === 'level') {
    const p1L = lv('point1_left_mm') || lv('left_mm');
    const p1R = lv('point1_right_mm') || lv('right_mm');
    html += `<div class="form-group"><label class="form-label">기준(mm)</label><input type="text" id="ins-edit-reference_mm" class="input" value="${lv('reference_mm') || '150'}" /></div>`;
    html += `<div class="form-group"><label class="form-label">1번 좌/우</label><input type="text" id="ins-edit-p1_left" class="input" style="width:60px;display:inline-block;" value="${p1L}" /> / <input type="text" id="ins-edit-p1_right" class="input" style="width:60px;display:inline-block;" value="${p1R}" /></div>`;
    html += `<div class="form-group"><label class="form-label">2번 좌/우</label><input type="text" id="ins-edit-p2_left" class="input" style="width:60px;" value="${lv('point2_left_mm')}" /> / <input type="text" id="ins-edit-p2_right" class="input" style="width:60px;" value="${lv('point2_right_mm')}" /></div>`;
    html += `<div class="form-group"><label class="form-label">3번 좌/우</label><input type="text" id="ins-edit-p3_left" class="input" style="width:60px;" value="${lv('point3_left_mm')}" /> / <input type="text" id="ins-edit-p3_right" class="input" style="width:60px;" value="${lv('point3_right_mm')}" /></div>`;
    html += `<div class="form-group"><label class="form-label">4번 좌/우</label><input type="text" id="ins-edit-p4_left" class="input" style="width:60px;" value="${lv('point4_left_mm')}" /> / <input type="text" id="ins-edit-p4_right" class="input" style="width:60px;" value="${lv('point4_right_mm')}" /></div>`;
  }
  if (type === 'thermal') {
    html += `<p class="small" style="color:#6b7280;">열화상은 위치·메모·결과·사진을 수정할 수 있습니다.</p>`;
  }
  const baseUrl = (typeof api !== 'undefined' && api.baseURL) ? api.baseURL.replace(/\/api\/?$/, '') : '';
  const photos = item.photos || [];
  // 육안·열화상: 사진 2슬롯 항상 표시 — 사진 영역 클릭 시 촬영/갤러리 선택 (세대주와 동일)
  if (type === 'visual' || type === 'thermal') {
    let photoSlotsHtml = '';
    for (let idx = 0; idx < 2; idx++) {
      const photo = photos[idx];
      if (photo) {
        const raw = photo.file_url || photo.url || '';
        const fullUrl = raw.startsWith('http') ? raw : (baseUrl + raw);
        const photoId = photo.id;
        const sortOrder = photo.sort_order != null ? photo.sort_order : idx;
        const inputId = photoId ? `ins-edit-photo-replace-${photoId}` : `ins-edit-photo-replace-${type}-${idx}`;
        const thumbId = photoId ? `ins-edit-photo-thumb-${photoId}` : `ins-edit-photo-thumb-${type}-${idx}`;
        const thumbStyle = fullUrl
          ? `background-image:url('${fullUrl}');cursor:pointer;`
          : 'background-color:#f5f5f5;cursor:pointer;';
        const clickHandler = photoId
          ? `document.getElementById('ins-edit-photo-replace-${photoId}').click()`
          : `document.getElementById('ins-edit-photo-replace-${type}-${idx}').click()`;
        photoSlotsHtml += `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin:4px;">
          <input type="file" id="${inputId}" accept="image/*" style="display:none" onchange="handleEditPhotoReplace('${item.id}', '${photoId || ''}', ${sortOrder}, this)" />
          <div id="${thumbId}" class="thumb" style="${thumbStyle}width:80px;height:80px;background-size:contain;background-position:center;background-repeat:no-repeat;border-radius:8px;border:1px solid #e5e7eb;" onclick="${clickHandler}" title="탭하여 사진 촬영 또는 갤러리에서 선택"></div>
        </div>`;
      } else {
        photoSlotsHtml += `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin:4px;">
          <input type="file" id="ins-edit-photo-add-${idx}" accept="image/*" style="display:none" onchange="handleEditPhotoAdd('${item.id}', ${idx}, this)" />
          <div id="ins-edit-photo-new-thumb-${idx}" class="thumb" style="width:80px;height:80px;background-color:#f5f5f5;background-size:contain;background-position:center;background-repeat:no-repeat;border-radius:8px;border:1px dashed #d1d5db;cursor:pointer;" onclick="document.getElementById('ins-edit-photo-add-${idx}').click()" title="탭하여 사진 촬영 또는 갤러리에서 선택"></div>
        </div>`;
      }
    }
    html += `<div class="form-group"><label class="form-label">사진 (최대 2장) — 탭하여 촬영/갤러리</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${photoSlotsHtml}</div></div>`;
  } else if (photos.length > 0) {
    // 공기질·라돈·레벨기: 기존 사진 있으면 탭하여 교체 (사진 영역 클릭 = 촬영/갤러리)
    const photoItems = photos.map((photo, idx) => {
      const raw = photo.file_url || photo.url || '';
      const fullUrl = raw.startsWith('http') ? raw : (baseUrl + raw);
      if (!fullUrl) return '';
      const photoId = photo.id;
      const sortOrder = photo.sort_order != null ? photo.sort_order : idx;
      const inputId = photoId ? `ins-edit-photo-replace-${photoId}` : `ins-edit-photo-replace-other-${idx}`;
      const thumbId = photoId ? `ins-edit-photo-thumb-${photoId}` : `ins-edit-photo-thumb-other-${idx}`;
      return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin:4px;">
        <input type="file" id="${inputId}" accept="image/*" style="display:none" onchange="handleEditPhotoReplace('${item.id}', '${photoId || ''}', ${sortOrder}, this)" />
        <div id="${thumbId}" class="thumb has-image" style="background-image:url('${fullUrl}');cursor:pointer;width:80px;height:80px;background-size:contain;background-position:center;background-repeat:no-repeat;border-radius:8px;border:1px solid #e5e7eb;" onclick="document.getElementById('${inputId}').click()" title="탭하여 사진 촬영 또는 갤러리에서 선택"></div>
      </div>`;
    }).filter(Boolean).join('');
    html += `<div class="form-group"><label class="form-label">등록된 사진 (${photos.length}장) — 탭하여 교체</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${photoItems}</div></div>`;
  }
  return html;
}

async function handleEditPhotoAdd(itemId, slotIndex, inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('이미지 파일만 업로드 가능합니다', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('파일 크기는 10MB 이하여야 합니다', 'error');
    return;
  }
  try {
    toast('사진 처리 중...', 'info');
    const compressedFile = await compressImage(file, 1920, 1080, 0.85);
    const uploadResult = await api.uploadImage(compressedFile);
    const url = uploadResult.url || `/uploads/${uploadResult.key || uploadResult.filename}`;
    InspectorState._editNewPhotos = InspectorState._editNewPhotos || {};
    InspectorState._editNewPhotos[slotIndex] = { url, sort_order: slotIndex };
    const baseUrl = (typeof api !== 'undefined' && api.baseURL) ? api.baseURL.replace(/\/api\/?$/, '') : '';
    const fullUrl = url.startsWith('http') ? url : (baseUrl + url);
    const thumbEl = $(`#ins-edit-photo-new-thumb-${slotIndex}`);
    if (thumbEl) {
      thumbEl.style.backgroundImage = `url('${fullUrl}')`;
      thumbEl.style.backgroundColor = 'transparent';
      thumbEl.style.cursor = 'pointer';
      thumbEl.onclick = () => showImageModal(fullUrl);
      thumbEl.title = '사진 ' + (slotIndex + 1);
    }
    inputElement.value = '';
    toast('사진이 추가되었습니다. 저장 버튼을 눌러 반영하세요', 'success');
  } catch (error) {
    console.error('사진 추가 실패:', error);
    toast(error.message || '사진 추가에 실패했습니다', 'error');
  }
}

async function handleEditPhotoReplace(itemId, photoId, sortOrder, inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('이미지 파일만 업로드 가능합니다', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('파일 크기는 10MB 이하여야 합니다', 'error');
    return;
  }
  try {
    toast('사진 처리 중...', 'info');
    const compressedFile = await compressImage(file, 1920, 1080, 0.85);
    const uploadResult = await api.uploadImage(compressedFile);
    const url = uploadResult.url || `/uploads/${uploadResult.key || uploadResult.filename}`;
    InspectorState._editReplacementPhotos = InspectorState._editReplacementPhotos || {};
    InspectorState._editReplacementPhotos[photoId] = { url, sort_order: sortOrder };
    const baseUrl = (typeof api !== 'undefined' && api.baseURL) ? api.baseURL.replace(/\/api\/?$/, '') : '';
    const fullUrl = url.startsWith('http') ? url : (baseUrl + url);
    const thumbEl = $(`#ins-edit-photo-thumb-${photoId}`);
    if (thumbEl) {
      thumbEl.style.backgroundImage = `url('${fullUrl}')`;
    }
    inputElement.value = '';
    toast('사진이 교체되었습니다. 저장 버튼을 눌러 반영하세요', 'success');
  } catch (error) {
    console.error('사진 교체 실패:', error);
    toast(error.message || '사진 교체에 실패했습니다', 'error');
  }
}

function openInspectionEditModal(itemId) {
  InspectorState._editReplacementPhotos = {};
  InspectorState._editNewPhotos = {};
  const data = InspectorState._editItemsById && InspectorState._editItemsById[itemId];
  if (!data) {
    toast('항목 정보를 찾을 수 없습니다', 'error');
    return;
  }
  const { item, type } = data;
  _editingInspectionId = itemId;
  _editingInspectionType = type;
  const bodyEl = $('#inspection-edit-modal-body');
  if (!bodyEl) return;
  bodyEl.innerHTML = buildInspectionEditForm(type, item);
  const modal = $('#inspection-edit-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

async function saveInspectionEdit() {
  if (!_editingInspectionId) return;
  const type = _editingInspectionType || $('#ins-edit-type')?.value;
  const body = {
    type,
    location: $('#ins-edit-location')?.value?.trim() || '',
    trade: $('#ins-edit-trade')?.value?.trim() || null,
    note: $('#ins-edit-note')?.value?.trim() || null,
    result: $('#ins-edit-result')?.value || 'normal'
  };
  if (type === 'air') {
    body.process_type = $('#ins-edit-process_type')?.value || null;
    const tvoc = $('#ins-edit-tvoc')?.value?.trim();
    const hcho = $('#ins-edit-hcho')?.value?.trim();
    body.tvoc = tvoc !== '' ? tvoc : null;
    body.hcho = hcho !== '' ? hcho : null;
  }
  if (type === 'radon') {
    const r = $('#ins-edit-radon')?.value?.trim();
    body.radon = r !== '' ? r : null;
    body.unit_radon = $('#ins-edit-unit_radon')?.value || 'Bq/m³';
  }
  if (type === 'level') {
    const p = (id) => $('#ins-edit-' + id)?.value?.trim();
    body.reference_mm = p('reference_mm') || 150;
    body.point1_left_mm = p('p1_left'); body.point1_right_mm = p('p1_right');
    body.point2_left_mm = p('p2_left'); body.point2_right_mm = p('p2_right');
    body.point3_left_mm = p('p3_left'); body.point3_right_mm = p('p3_right');
    body.point4_left_mm = p('p4_left'); body.point4_right_mm = p('p4_right');
  }
  setLoading(true);
  try {
    await api.updateInspectionItem(_editingInspectionId, body);
    // 교체된 사진 반영: 기존 삭제 후 새 사진 추가
    const replacements = InspectorState._editReplacementPhotos || {};
    for (const [photoId, data] of Object.entries(replacements)) {
      try {
        await api.deleteInspectionPhoto(_editingInspectionId, photoId);
        await api.addInspectionPhoto(_editingInspectionId, data.url, `사진 ${(data.sort_order || 0) + 1}`, data.sort_order ?? 0);
      } catch (photoErr) {
        console.error('사진 교체 반영 실패:', photoErr);
        toast('일부 사진 교체 반영에 실패했습니다', 'warning');
      }
    }
    // 육안: 새로 추가한 사진 반영
    const newPhotos = InspectorState._editNewPhotos || {};
    for (let slot = 0; slot < 2; slot++) {
      const data = newPhotos[slot];
      if (data && data.url) {
        try {
          await api.addInspectionPhoto(_editingInspectionId, data.url, `사진 ${slot + 1}`, data.sort_order ?? slot);
        } catch (photoErr) {
          console.error('사진 추가 반영 실패:', photoErr);
          toast('일부 사진 추가 반영에 실패했습니다', 'warning');
        }
      }
    }
    toast('수정되었습니다', 'success');
    closeInspectionEditModal();
    if (InspectorState.selectedHouseholdId) {
      const inspRes = await api.getInspectionsByHousehold(InspectorState.selectedHouseholdId);
      InspectorState.householdInspections = inspRes.inspections || { visual: [], thermal: [], air: [], radon: [], level: [] };
      renderHouseholdInspectionsList();
    }
    if (_detailModalDefectId) {
      const res = await api.getDefectInspections(_detailModalDefectId);
      const inspections = res.inspections || {};
      InspectorState._editItemsById = InspectorState._editItemsById || {};
      const typeOrder = ['visual', 'air', 'radon', 'level', 'thermal'];
      let html = '';
      for (const t of typeOrder) {
        const items = inspections[t] || [];
        items.forEach((it) => {
          if (it.id) InspectorState._editItemsById[it.id] = { item: it, type: t };
          html += formatInspectionItemByType(t, it, { showEdit: true });
        });
      }
      const detailBody = $('#inspection-detail-modal-body');
      if (detailBody) detailBody.innerHTML = html || '<p style="color:#6b7280;">등록된 점검결과가 없습니다.</p>';
    }
  } catch (e) {
    console.error('점검결과 수정 오류:', e);
    toast(e.message || '수정에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

async function deleteInspectionItem(itemId) {
  if (!confirm('이 점검결과를 삭제하시겠습니까?')) return;
  setLoading(true);
  try {
    await api.deleteInspection(itemId);
    toast('삭제되었습니다', 'success');
    closeInspectionEditModal();
    if (InspectorState._editItemsById && itemId in InspectorState._editItemsById) {
      delete InspectorState._editItemsById[itemId];
    }
    if (InspectorState.selectedHouseholdId) {
      const inspRes = await api.getInspectionsByHousehold(InspectorState.selectedHouseholdId);
      InspectorState.householdInspections = inspRes.inspections || { visual: [], thermal: [], air: [], radon: [], level: [] };
      renderHouseholdInspectionsList();
    }
    if (_detailModalDefectId) {
      const res = await api.getDefectInspections(_detailModalDefectId);
      const inspections = res.inspections || {};
      InspectorState._editItemsById = InspectorState._editItemsById || {};
      const typeOrder = ['visual', 'air', 'radon', 'level', 'thermal'];
      let html = '';
      for (const type of typeOrder) {
        const items = inspections[type] || [];
        items.forEach((it) => {
          if (it.id) InspectorState._editItemsById[it.id] = { item: it, type };
          html += formatInspectionItemByType(type, it, { showEdit: true });
        });
      }
      const detailBody = $('#inspection-detail-modal-body');
      if (detailBody) detailBody.innerHTML = html || '<p style="color:#6b7280;">등록된 점검결과가 없습니다.</p>';
    }
  } catch (e) {
    console.error('점검결과 삭제 오류:', e);
    toast(e.message || '삭제에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

async function deleteHouseholdInspections() {
  const householdId = InspectorState.selectedHouseholdId;
  if (!householdId) {
    toast('세대 정보를 찾을 수 없습니다', 'error');
    return;
  }
  if (!InspectorState.inspectionByHousehold) {
    toast('세대별 점검결과 입력 화면에서만 사용할 수 있습니다', 'error');
    return;
  }
  if (!confirm('이 세대의 모든 점검결과(육안·공기질·라돈·레벨기·열화상)를 삭제합니다. 계속하시겠습니까?')) return;
  if (!confirm('삭제된 데이터는 복구할 수 없습니다. 정말 삭제하시겠습니까?')) return;
  setLoading(true);
  try {
    const res = await api.deleteHouseholdInspections(householdId);
    const count = res.deleted || 0;
    toast(`${count}건이 삭제되었습니다`, 'success');
    InspectorState.householdInspections = { visual: [], thermal: [], air: [], radon: [], level: [] };
    renderHouseholdInspectionsList();
  } catch (e) {
    console.error('세대 점검결과 삭제 오류:', e);
    toast(e.message || '삭제에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

function formatInspectionItemByType(type, item, opts = {}) {
  const v = (x) => (x != null && x !== '' ? String(x) : '-');
  const lv = (key) => { const x = item[key] ?? (item.level_measure && item.level_measure[key]); return v(x); };
  const typeNames = { visual: '육안', air: '공기질', radon: '라돈', level: '레벨기', thermal: '열화상' };
  const rows = [];
  rows.push(`<tr><td class="ins-detail-label">위치</td><td>${escapeHTML(v(item.location))}</td></tr>`);
  if (item.trade) rows.push(`<tr><td class="ins-detail-label">공종</td><td>${escapeHTML(v(item.trade))}</td></tr>`);
  if (item.note) rows.push(`<tr><td class="ins-detail-label">메모</td><td>${escapeHTML(v(item.note))}</td></tr>`);
  if (item.result_text || item.result) rows.push(`<tr><td class="ins-detail-label">결과</td><td>${escapeHTML(v(item.result_text || item.result))}</td></tr>`);
  if (type === 'air') {
    if (item.process_type) rows.push(`<tr><td class="ins-detail-label">유형</td><td>${escapeHTML(v(item.process_type))}</td></tr>`);
    if (item.tvoc != null) rows.push(`<tr><td class="ins-detail-label">TVOC</td><td>${v(item.tvoc)}</td></tr>`);
    if (item.hcho != null) rows.push(`<tr><td class="ins-detail-label">HCHO</td><td>${v(item.hcho)}</td></tr>`);
  }
  if (type === 'radon' && (item.radon != null || item.unit_radon || item.unit)) rows.push(`<tr><td class="ins-detail-label">라돈</td><td>${v(item.radon)} ${v(item.unit_radon || item.unit)}</td></tr>`);
  if (type === 'level') {
    const refMm = item.reference_mm ?? item.level_reference_mm;
    if (refMm != null) rows.push(`<tr><td class="ins-detail-label">기준(mm)</td><td>${v(refMm)}</td></tr>`);
    const has4 = item.point1_left_mm != null || item.point1_right_mm != null || item.point2_left_mm != null || item.point2_right_mm != null || item.point3_left_mm != null || item.point3_right_mm != null || item.point4_left_mm != null || item.point4_right_mm != null;
    const hasLegacy = item.left_mm != null || item.right_mm != null;
    if (has4) {
      const p1 = `1번 ${lv('point1_left_mm')}/${lv('point1_right_mm')}`;
      const p2 = `2번 ${lv('point2_left_mm')}/${lv('point2_right_mm')}`;
      const p3 = `3번 ${lv('point3_left_mm')}/${lv('point3_right_mm')}`;
      const p4 = `4번 ${lv('point4_left_mm')}/${lv('point4_right_mm')}`;
      rows.push(`<tr><td class="ins-detail-label">4점</td><td>${p1}, ${p2}, ${p3}, ${p4} mm</td></tr>`);
    }
    if (hasLegacy && !has4) rows.push(`<tr><td class="ins-detail-label">좌/우</td><td>${v(item.left_mm)} / ${v(item.right_mm)} mm</td></tr>`);
  }
  const baseUrl = (typeof api !== 'undefined' && api && api.baseURL)
    ? String(api.baseURL).replace(/\/api\/?$/, '').replace(/\/$/, '')
    : 'https://mobile-app-new.onrender.com';
  const photos = (() => {
    const p = item.photos;
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') return Object.values(p);
    return [];
  })();
  const toFullUrl = (raw) => {
    if (raw == null || typeof raw !== 'string') return '';
    const s = String(raw).trim();
    if (!s) return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const path = s.startsWith('/') ? s : '/' + s;
    return baseUrl ? baseUrl + path : s;
  };
  const getPhotoUrl = (photo) => {
    const raw = photo.file_url ?? photo.url ?? photo.thumb_url ?? '';
    return toFullUrl(raw);
  };
  const validPhotos = photos.filter((p) => p && getPhotoUrl(p));
  const photoThumbs = validPhotos.map((photo) => {
    const fullUrl = getPhotoUrl(photo);
    if (!fullUrl) return '';
    const safe = (s) => String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `<span style="display:inline-block;width:48px;height:48px;background:#e5e7eb;border-radius:8px;overflow:hidden;margin:2px;"><img src="${safe(fullUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="showImageModal('${safe(fullUrl)}')" title="사진" onerror="this.style.display='none'" referrerpolicy="no-referrer" /></span>`;
  }).filter(Boolean).join('');
  rows.push(`<tr><td class="ins-detail-label">사진</td><td>${validPhotos.length > 0 ? `${validPhotos.length}장 ${photoThumbs ? `<span class="gallery" style="display:inline-flex;gap:4px;margin-left:8px;flex-wrap:wrap;">${photoThumbs}</span>` : ''}` : '<span style="color:#9ca3af;">없음</span>'}</td></tr>`);
  const editBtn = (opts.showEdit && item.id) ? `<button type="button" class="button ghost" style="margin-top:6px;font-size:12px;margin-right:6px;" onclick="openInspectionEditModal('${item.id}')">수정</button>` : '';
  const deleteBtn = (opts.showEdit && item.id) ? `<button type="button" class="button ghost" style="margin-top:6px;font-size:12px;color:#dc2626;" onclick="deleteInspectionItem('${item.id}')">삭제</button>` : '';
  return `<div class="ins-detail-block" data-edit-id="${item.id || ''}" data-edit-type="${type}"><div class="ins-detail-type">${typeNames[type] || type}</div><table class="ins-detail-table">${rows.join('')}</table>${editBtn}${deleteBtn}</div>`;
}

async function showInspectionDetailModal(defectId) {
  _detailModalDefectId = defectId;
  const modal = $('#inspection-detail-modal');
  const subtitleEl = $('#inspection-detail-modal-subtitle');
  const bodyEl = $('#inspection-detail-modal-body');
  if (!modal || !bodyEl) return;
  setLoading(true);
  try {
    let defectTitle = '';
    try {
      const defect = await api.getDefect(defectId);
      defectTitle = `${defect.location || ''} - ${defect.trade || ''}`.trim() || `하자 #${defectId}`;
    } catch (_) { defectTitle = `하자 #${defectId}`; }
    if (subtitleEl) subtitleEl.textContent = defectTitle;
    const res = await api.getDefectInspections(defectId);
    const inspections = res.inspections || {};
    InspectorState._editItemsById = InspectorState._editItemsById || {};
    const typeOrder = ['visual', 'air', 'radon', 'level', 'thermal'];
    let html = '';
    for (const type of typeOrder) {
      const items = inspections[type];
      if (!items || items.length === 0) continue;
      items.forEach((item) => {
        if (item.id) InspectorState._editItemsById[item.id] = { item, type };
        html += formatInspectionItemByType(type, item, { showEdit: true });
      });
    }
    if (!html) html = '<p style="color:#6b7280;">등록된 점검결과가 없습니다.</p>';
    bodyEl.innerHTML = html;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  } catch (e) {
    console.error('점검결과 상세 조회 오류:', e);
    toast('점검결과를 불러오는데 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 점검결과 입력 화면: 입력된 점검결과 목록 렌더 (세대별, 점검방법별 탭) — 수정 버튼용으로 itemById 저장
function renderHouseholdInspectionsList() {
  const ref = $('#defect-inspection-saved-ref');
  if (!ref) return;
  const insp = InspectorState.householdInspections || { visual: [], thermal: [], air: [], radon: [], level: [] };
  InspectorState._editItemsById = InspectorState._editItemsById || {};
  const typeOrder = ['visual', 'air', 'radon', 'level', 'thermal'];
  const typeNames = { visual: '육안', air: '공기질', radon: '라돈', level: '레벨기', thermal: '열화상' };
  let total = 0;
  const panelById = {
    visual: $('#saved-visual-panel'),
    air: $('#saved-air-panel'),
    radon: $('#saved-radon-panel'),
    level: $('#saved-level-panel'),
    thermal: $('#saved-thermal-panel')
  };
  let firstActiveType = null;
  for (const type of typeOrder) {
    const items = insp[type] || [];
    total += items.length;
    let html = '';
    items.forEach((item) => {
      if (item.id) InspectorState._editItemsById[item.id] = { item, type };
      html += formatInspectionItemByType(type, item, { showEdit: true });
    });
    const panel = panelById[type];
    if (panel) {
      panel.innerHTML = html || `<p style="color:#9ca3af;font-size:13px;">${typeNames[type]} 점검결과가 없습니다.</p>`;
      if (items.length > 0 && !firstActiveType) firstActiveType = type;
    }
  }
  if (total > 0) {
    ref.style.display = 'block';
    // 수정/삭제 후 현재 보고 있던 탭 유지 (해당 탭에 항목이 있으면), 없으면 첫 번째 탭으로
    const keepTab = InspectorState._currentSavedTab;
    const keepTabHasItems = keepTab && (insp[keepTab] || []).length > 0;
    const tabToShow = keepTabHasItems ? keepTab : (firstActiveType || 'visual');
    showSavedResultsTab(tabToShow);
  } else {
    ref.style.display = 'none';
  }
}

function showSavedResultsTab(type) {
  InspectorState._currentSavedTab = type;
  const container = document.querySelector('#defect-inspection-saved-ref');
  if (!container) return;
  container.querySelectorAll('.saved-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-type') === type);
  });
  ['visual', 'air', 'radon', 'level', 'thermal'].forEach((t) => {
    const panel = document.getElementById('saved-' + t + '-panel');
    if (panel) panel.classList.toggle('hidden', t !== type);
  });
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

    renderHouseholdInspectionsList();

    const householdDeleteRef = $('#defect-inspection-household-delete-ref');
    if (householdDeleteRef) householdDeleteRef.style.display = 'block';

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
  const savedRef = $('#defect-inspection-saved-ref');
  if (savedRef) savedRef.style.display = 'none';
  const householdDeleteRef = $('#defect-inspection-household-delete-ref');
  if (householdDeleteRef) householdDeleteRef.style.display = 'none';
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

// 측정값 사진 업로드 처리 (slotIndex: 0 또는 1, 최대 2장)
async function handleMeasurementPhotoUpload(type, inputElement, slotIndex) {
  const file = inputElement.files[0];
  if (!file) return;
  if (slotIndex !== 0 && slotIndex !== 1) slotIndex = 0;

  if (!file.type.startsWith('image/')) {
    toast('이미지 파일만 업로드 가능합니다', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('파일 크기는 10MB 이하여야 합니다', 'error');
    return;
  }

  try {
    toast('사진 처리 중...', 'info');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewId = `defect-${type}-photo-preview-${slotIndex + 1}`;
      const previewElement = $(`#${previewId}`);
      if (previewElement) {
        previewElement.style.backgroundImage = `url(${e.target.result})`;
        previewElement.style.display = 'block';
      }
      try {
        const compressedFile = await compressImage(file, 1920, 1080, 0.85);
        const uploadResult = await api.uploadImage(compressedFile);
        const url = uploadResult.url || `/uploads/${uploadResult.key || uploadResult.filename}`;
        const key = uploadResult.key || uploadResult.filename;
        if (!Array.isArray(InspectorState.measurementPhotos[type])) {
          InspectorState.measurementPhotos[type] = [];
        }
        InspectorState.measurementPhotos[type][slotIndex] = { file: compressedFile, url, key };
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
  const photoTypes = ['visual', 'air', 'radon', 'level', 'thermal'];
  photoTypes.forEach((type) => {
    [1, 2].forEach((i) => {
      const preview = $(`#defect-${type}-photo-preview-${i}`);
      const input = $(`#defect-${type}-photo-${i}`);
      if (preview) { preview.style.backgroundImage = ''; preview.style.display = 'none'; }
      if (input) input.value = '';
    });
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
    
    const photoTypes = ['visual', 'air', 'radon', 'level', 'thermal'];
    photoTypes.forEach(type => {
      [1, 2].forEach((i) => {
        const previewElement = $(`#defect-${type}-photo-preview-${i}`);
        const inputElement = $(`#defect-${type}-photo-${i}`);
        if (previewElement) {
          previewElement.style.backgroundImage = '';
          previewElement.style.display = 'none';
        }
        if (inputElement) inputElement.value = '';
      });
    });
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
      const measurementType = tabType === '육안' ? 'visual' :
                             tabType === '공기질' ? 'air' :
                             tabType === '라돈' ? 'radon' :
                             tabType === '레벨기' ? 'level' :
                             tabType === '열화상' ? 'thermal' : null;
      const photos = measurementType && Array.isArray(InspectorState.measurementPhotos[measurementType])
        ? InspectorState.measurementPhotos[measurementType].filter(Boolean)
        : [];
      if (photos.length > 0 && response.item && response.item.id) {
        const itemId = response.item.id;
        for (let i = 0; i < photos.length && i < 2; i++) {
          try {
            await api.addInspectionPhoto(itemId, photos[i].url, `사진 ${i + 1}`, i);
            console.log(`✅ 점검 사진 ${i + 1} 저장 완료`);
          } catch (photoError) {
            console.error('⚠️ 점검 사진 저장 실패:', photoError);
          }
        }
      }
      if (measurementType) {
        InspectorState.measurementPhotos[measurementType] = [];
      }
      
      toast('점검결과가 저장되었습니다', 'success');

      if (InspectorState.inspectionByHousehold && InspectorState.selectedHouseholdId) {
        const inspRes = await api.getInspectionsByHousehold(InspectorState.selectedHouseholdId);
        InspectorState.householdInspections = inspRes.inspections || { visual: [], thermal: [], air: [], radon: [], level: [] };
        renderHouseholdInspectionsList();
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
              ${d.photos.map(photo => {
                const raw = photo.url || photo.file_url || '';
                const fullUrl = raw.startsWith('http') ? raw : (baseUrl + raw);
                return fullUrl ? `<div class="thumb has-image" style="background-image:url('${fullUrl}');cursor:pointer;" onclick="showImageModal('${fullUrl}')">${photo.kind === 'near' ? '근접' : '원거리'}</div>` : '';
              }).filter(Boolean).join('')}
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

// 최종보고서 미리보기
async function previewFinalReportAsPdf() {
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
      const errorMsg = generateResult?.message || generateResult?.error || '최종보고서 생성에 실패했습니다';
      throw new Error(errorMsg);
    }
    if (!generateResult.filename) throw new Error('PDF 파일명을 받지 못했습니다.');
    toast('미리보기를 여는 중...', 'info');
    await api.previewReport(generateResult.filename);
    toast('최종보고서 미리보기 창이 열렸습니다', 'success');
  } catch (error) {
    console.error('최종보고서 미리보기 오류:', error);
    toast(error.message || '최종보고서 미리보기에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 수기보고서 미리보기
async function previewSummaryReportAsPdf() {
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
      const errorMsg = generateResult?.message || generateResult?.error || '수기보고서 생성에 실패했습니다';
      throw new Error(errorMsg);
    }
    if (!generateResult.filename) throw new Error('PDF 파일명을 받지 못했습니다.');
    toast('미리보기를 여는 중...', 'info');
    await api.previewReport(generateResult.filename);
    toast('수기보고서 미리보기 창이 열렸습니다', 'success');
  } catch (error) {
    console.error('수기보고서 미리보기 오류:', error);
    toast(error.message || '수기보고서 미리보기에 실패했습니다', 'error');
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

// 최종보고서-수치중심 다운로드 (공기질/레벨기 리스트형 + 사진 하단)
async function downloadFinalReportValuesAsPdf() {
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
    toast('최종보고서(수치중심) 생성 중...', 'info');
    const generateResult = await api.generateReport(InspectorState.currentCaseId, householdId, { template: 'final-report-values' });
    if (!generateResult || !generateResult.success) {
      throw new Error(generateResult?.message || generateResult?.error || '최종보고서(수치중심) 생성에 실패했습니다');
    }
    if (!generateResult.filename) throw new Error('파일명을 받지 못했습니다.');

    toast('다운로드 중...', 'info');
    await api.downloadReport(generateResult.filename);
    toast('최종보고서(수치중심) 다운로드가 완료되었습니다', 'success');
  } catch (error) {
    console.error('최종보고서(수치중심) 다운로드 오류:', error);
    toast(error.message || '최종보고서(수치중심) 다운로드에 실패했습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// 최종보고서-수치중심 미리보기
async function previewFinalReportValuesAsPdf() {
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
    toast('최종보고서(수치중심) 생성 중...', 'info');
    const generateResult = await api.generateReport(InspectorState.currentCaseId, householdId, { template: 'final-report-values' });
    if (!generateResult || !generateResult.success) {
      throw new Error(generateResult?.message || generateResult?.error || '최종보고서(수치중심) 생성에 실패했습니다');
    }
    if (!generateResult.filename) throw new Error('PDF 파일명을 받지 못했습니다.');
    toast('미리보기를 여는 중...', 'info');
    await api.previewReport(generateResult.filename);
    toast('최종보고서(수치중심) 미리보기 창이 열렸습니다', 'success');
  } catch (error) {
    console.error('최종보고서(수치중심) 미리보기 오류:', error);
    toast(error.message || '최종보고서(수치중심) 미리보기에 실패했습니다', 'error');
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

