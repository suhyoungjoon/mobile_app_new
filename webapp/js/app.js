
// Enhanced SPA with backend API integration
const $ = (q)=>document.querySelector(q);
const $$ = (q)=>document.querySelectorAll(q);

// AppState for global state management
const AppState = {
  _session: null,
  currentCaseId: null,
  photoNearKey: null,
  photoFarKey: null,
  get session() {
    return this._session;
  },
  set session(newSession) {
    this._session = newSession;
    if (newSession && newSession.token) {
      api.setToken(newSession.token);
      localStorage.setItem('insighti_session', JSON.stringify(newSession));
    } else {
      api.clearToken();
      localStorage.removeItem('insighti_session');
    }
  },
  get token() {
    return localStorage.getItem('insighti_token');
  }
};

// Loading state management
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
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showError(error) {
  console.error('Error:', error);
  toast(`오류: ${error.message}`, 'error');
}

// 네비게이션 히스토리
const navigationHistory = [];

function route(screen){
  // 히스토리 추가
  const currentScreen = Array.from($$('.screen')).find(el => !el.classList.contains('hidden'))?.id;
  
  if (currentScreen && currentScreen !== screen && screen !== 'login') {
    navigationHistory.push(currentScreen);
    // 히스토리 최대 10개까지만 유지
    if (navigationHistory.length > 10) {
      navigationHistory.shift();
    }
  }
  
  $$('.screen').forEach(el=>el.classList.add('hidden'));
  $(`#${screen}`).classList.remove('hidden');
  // tab highlight
  $$('.tabbar button').forEach(b=>b.classList.remove('active'));
  if(screen==='list') $('#tab-list').classList.add('active');
  if(screen==='newdefect') $('#tab-add').classList.add('active');
  if(screen==='report') $('#tab-report').classList.add('active');
  
  // 사용자 메뉴 닫기
  closeUserMenu();
  
  // 하자 등록 화면 진입 시 고객 정보 표시
  if (screen === 'newdefect') {
    if (AppState.session) {
      const { complex, dong, ho, name } = AppState.session;
      $('#customer-details').textContent = `${dong}동 ${ho}호 ${name}`;
    }
    // 하자 카테고리가 로드되지 않았다면 다시 로드
    if ($('#defect-category').children.length <= 1) {
      loadDefectCategories();
    }
  }
}

// 사용자 메뉴 토글
function toggleUserMenu() {
  const menu = $('#user-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// 사용자 메뉴 닫기
function closeUserMenu() {
  const menu = $('#user-menu');
  if (menu) {
    menu.classList.add('hidden');
  }
}

// 로그아웃
function onLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    // 토큰 및 세션 삭제
    api.clearToken();
    AppState.session = null;
    
    // UI 초기화
    $('#badge-user').textContent = '게스트';
    
    // 로그인 화면으로 이동
    route('login');
    
    toast('로그아웃 되었습니다', 'success');
    console.log('✅ 로그아웃 완료');
  }
}

// 내 정보 보기
function showMyInfo() {
  closeUserMenu();
  
  if (!AppState.session) {
    toast('로그인이 필요합니다', 'error');
    return;
  }
  
  const info = `
단지: ${AppState.session.complex}
동: ${AppState.session.dong}
호: ${AppState.session.ho}
이름: ${AppState.session.name}
전화번호: ${AppState.session.phone}
  `.trim();
  
  alert(info);
}

// 내 하자 현황
async function showMyStats() {
  closeUserMenu();
  
  if (!checkAuth()) return;
  
  try {
    const cases = await api.getCases();
    const totalDefects = cases.reduce((sum, c) => sum + (c.defect_count || 0), 0);
    
    const stats = `
총 케이스: ${cases.length}건
총 하자: ${totalDefects}건
    `.trim();
    
    alert(stats);
  } catch (error) {
    showError(error);
  }
}

// Admin 페이지로 이동
function goToAdmin() {
  closeUserMenu();
  route('admin');
}

// 뒤로가기 기능
function goBack() {
  if (navigationHistory.length > 0) {
    const previousScreen = navigationHistory.pop();
    route(previousScreen);
  } else {
    // 히스토리가 없으면 목록으로
    route('list');
  }
}

async function onLogin(){
  if (isLoading) return;
  
  const complex = $('#login-complex').value.trim();
  const dong = $('#login-dong').value.trim();
  const ho = $('#login-ho').value.trim();
  const name = $('#login-name').value.trim();
  const phone = $('#login-phone').value.trim();
  
  if(!complex || !dong || !ho || !name || !phone){
    toast('입력값을 확인해 주세요', 'error');
    return;
  }

      setLoading(true);
      toast('로그인 중... 처음 접속 시 최대 1-2분 소요될 수 있습니다 (무료 서버 시작 중)', 'info');
  
  try {
    const response = await api.login(complex, dong, ho, name, phone);
    
    // Store session data
    AppState.session = {
      complex, dong, ho, name, phone,
      token: response.token,
      expires_at: response.expires_at
    };
    
    $('#badge-user').textContent = `${dong}-${ho} ${name}`;
    toast('로그인 성공', 'success');
    
    // Load cases after login
    await loadCases();
    route('list');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

async function loadCases() {
  if (!AppState.session) return;
  
  try {
    const cases = await api.getCases();
    AppState.cases = cases;
    renderCaseList();
  } catch (error) {
    showError(error);
  }
}

async function onShowList() {
  if (!checkAuth()) return;
  await loadCases();
  route('list');
}

function renderCaseList(){
  const wrap = $('#case-list');
  wrap.innerHTML = '';
  
  if (!AppState.cases || AppState.cases.length === 0) {
    wrap.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #666; margin-bottom: 20px;">등록된 케이스가 없습니다.</div>
        <button class="button" onclick="createNewCase()">새 케이스 생성</button>
      </div>
    `;
    return;
  }
  
  AppState.cases.forEach(cs=>{
    const div = document.createElement('div');
    div.className = 'card';
    const cnt = cs.defects ? cs.defects.length : 0;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-weight:700;">${cs.type}</div>
        <div class="badge-chip">${cs.id}</div>
        <div class="badge" style="margin-left:auto;">${formatDate(cs.created_at)}</div>
      </div>
      <div class="small">등록된 하자: ${cnt}건</div>
      <div class="hr"></div>
      <div class="button-group">
        <button class="button ghost" onclick="viewCaseDefects('${cs.id}')">상세보기</button>
        <button class="button" onclick="addDefectToCase('${cs.id}')">하자 추가</button>
      </div>
    `;
    wrap.appendChild(div);
  });
}

async function createNewCase() {
  if (isLoading) return;
  
  setLoading(true);
  
  try {
    const newCase = await api.createCase({
      type: '하자접수'
    });
    
    AppState.cases.unshift(newCase);
    AppState.currentCaseId = newCase.id;
    renderCaseList();
    toast('새 케이스가 생성되었습니다', 'success');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// 케이스별 하자 목록 보기
async function viewCaseDefects(caseId) {
  if (!checkAuth()) return;
  
  setLoading(true);
  try {
    AppState.currentCaseId = caseId;
    const defects = await api.getDefects(caseId);
    
    const container = $('#defect-list-container');
    const titleEl = $('#case-detail-title');
    
    if (titleEl) titleEl.textContent = `케이스 ${caseId} 상세`;
    
    if (!defects || defects.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
        </div>
      `;
    } else {
      container.innerHTML = defects.map(defect => `
        <div class="card">
          <div class="defect-header">
            <strong>${defect.location} - ${defect.trade}</strong>
            <span class="badge">${formatDate(defect.created_at)}</span>
          </div>
          <div class="defect-content">
            <div class="label">내용:</div>
            <p>${defect.content}</p>
            ${defect.memo ? `
              <div class="label" style="margin-top:8px;">메모:</div>
              <p>${defect.memo}</p>
            ` : ''}
          </div>
          <div class="hr"></div>
          <div class="button-group">
            <button class="button small" onclick="editDefect('${defect.id}')">✏️ 수정</button>
            <button class="button small danger" onclick="deleteDefect('${defect.id}')">🗑️ 삭제</button>
          </div>
        </div>
      `).join('');
    }
    
    route('case-detail');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// 케이스에 하자 추가 (currentCaseId 설정 후 하자 등록 화면으로)
function addDefectToCase(caseId) {
  AppState.currentCaseId = caseId;
  route('newdefect');
}

// 하자 수정 화면으로 이동
async function editDefect(defectId) {
  if (!checkAuth()) return;
  
  setLoading(true);
  try {
    const defect = await api.getDefect(defectId);
    AppState.editingDefectId = defectId;
    
    // 폼에 기존 데이터 채우기
    $('#edit-location').value = defect.location || '';
    $('#edit-trade').value = defect.trade || '';
    $('#edit-content').value = defect.content || '';
    $('#edit-memo').value = defect.memo || '';
    
    route('edit-defect');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// 하자 수정 저장
async function saveDefectEdit() {
  if (!checkAuth()) return;
  if (isLoading) return;
  
  const location = $('#edit-location').value.trim();
  const trade = $('#edit-trade').value.trim();
  const content = $('#edit-content').value.trim();
  const memo = $('#edit-memo').value.trim();
  
  if (!location || !trade || !content) {
    toast('위치, 세부공정, 내용은 필수입니다', 'error');
    return;
  }
  
  setLoading(true);
  try {
    const defectData = {
      location,
      trade,
      content,
      memo
    };
    
    await api.updateDefect(AppState.editingDefectId, defectData);
    toast('하자가 수정되었습니다', 'success');
    
    // 케이스 상세 화면으로 돌아가기
    await viewCaseDefects(AppState.currentCaseId);
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// 하자 수정 취소
function cancelEdit() {
  if (AppState.currentCaseId) {
    viewCaseDefects(AppState.currentCaseId);
  } else {
    route('list');
  }
}

// 하자 삭제 (Phase 1-4에서 구현 예정)
async function deleteDefect(defectId) {
  toast('하자 삭제 기능은 다음 단계에서 구현됩니다', 'info');
}

async function onSaveDefect(){
  if (isLoading) return;
  
  const location = $('#def-location').value.trim();
  const trade = $('#def-trade').value.trim();
  const content = $('#def-content').value.trim();
  const memo = $('#def-memo').value.trim();
  
  if(!location || !trade || !content){
    toast('위치/세부공정/내용을 입력해 주세요', 'error');
    return;
  }

  const caseId = AppState.currentCaseId;
  if (!caseId) {
    toast('먼저 케이스를 생성해 주세요', 'error');
    return;
  }

  setLoading(true);
  
  try {
    // Use photo keys from AppState (already uploaded during photo selection)
    const photoNearKey = AppState.photoNearKey || '';
    const photoFarKey = AppState.photoFarKey || '';
    
    // Create defect
    const defectData = {
      case_id: caseId,
      location,
      trade,
      content,
      memo,
      photo_near_key: photoNearKey,
      photo_far_key: photoFarKey
    };
    
    const newDefect = await api.createDefect(defectData);
    
    // Clear form
    $('#def-location').value = '';
    $('#def-trade').value = '';
    $('#def-content').value = '';
    $('#def-memo').value = '';
    $('#defect-category').value = '';
    
    // Clear photos
    const photoNear = $('#photo-near');
    const photoFar = $('#photo-far');
    if (photoNear) {
      photoNear.style.backgroundImage = '';
      photoNear.classList.remove('has-image');
    }
    if (photoFar) {
      photoFar.style.backgroundImage = '';
      photoFar.classList.remove('has-image');
    }
    
    // Clear photo inputs
    const inputNearCamera = $('#input-near-camera');
    const inputNearGallery = $('#input-near-gallery');
    const inputFarCamera = $('#input-far-camera');
    const inputFarGallery = $('#input-far-gallery');
    if (inputNearCamera) inputNearCamera.value = '';
    if (inputNearGallery) inputNearGallery.value = '';
    if (inputFarCamera) inputFarCamera.value = '';
    if (inputFarGallery) inputFarGallery.value = '';
    
    // Clear AppState
    AppState.photoNearKey = null;
    AppState.photoFarKey = null;
    
    toast('하자가 저장되었습니다', 'success');
    
    // Reload cases
    await loadCases();
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

async function onPreviewReport(){
  if (isLoading) return;
  
  if (!AppState.cases || AppState.cases.length === 0) {
    toast('먼저 케이스를 생성해 주세요', 'error');
    return;
  }

  setLoading(true);
  
  try {
    const reportData = await api.getReportPreview();
    const cont = $('#report-preview');
    cont.innerHTML = '';
    
    if (reportData.defects && reportData.defects.length > 0) {
      reportData.defects.forEach((d, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="font-weight:700;">${d.location} / ${d.trade}</div>
          <div class="small">${d.content}</div>
          ${d.memo ? `<div class="small" style="color: #666; margin-top: 4px;">메모: ${d.memo}</div>` : ''}
          <div class="gallery" style="margin-top:8px;">
            <div class="thumb">${d.photos && d.photos.length > 0 ? '<img src="http://localhost:3000/uploads/'+d.photos[0].url+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />' : '근거리'}</div>
            <div class="thumb">${d.photos && d.photos.length > 1 ? '<img src="http://localhost:3000/uploads/'+d.photos[1].url+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />' : '원거리'}</div>
          </div>
        `;
        cont.appendChild(card);
      });
    } else {
      cont.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">등록된 하자가 없습니다.</div>
        </div>
      `;
    }
    
    route('report');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// SMS로 보고서 보내기
async function sendReportAsSMS() {
  if (!checkAuth()) return;
  
  const caseId = AppState.currentCaseId;
  if (!caseId) {
    toast('케이스를 먼저 선택해주세요', 'error');
    return;
  }
  
  const phoneNumber = prompt('보고서를 받을 전화번호를 입력하세요 (예: 010-0000-0000)');
  if (!phoneNumber) return;
  
  setLoading(true);
  try {
    await api.sendSMSReport(caseId, phoneNumber);
    toast('SMS로 보고서가 발송되었습니다', 'success');
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

// PDF 다운로드
function downloadReportAsPdf() {
  toast('PDF 다운로드 기능은 향후 구현 예정입니다', 'info');
  // TODO: PDF 생성 및 다운로드 기능 구현
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function checkAuth() {
  const token = localStorage.getItem('insighti_token');
  if (token) {
    api.setToken(token);
    // Try to restore session from localStorage
    const sessionData = localStorage.getItem('insighti_session');
    if (sessionData) {
      try {
        AppState.session = JSON.parse(sessionData);
        $('#badge-user').textContent = `${AppState.session.dong}-${AppState.session.ho} ${AppState.session.name}`;
        loadCases();
        route('list');
        return true;
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem('insighti_session');
        localStorage.removeItem('insighti_token');
      }
    }
  }
  return false;
}

function logout() {
  api.clearToken();
  localStorage.removeItem('insighti_session');
  AppState.session = null;
  AppState.cases = [];
  $('#badge-user').textContent = '게스트';
  route('login');
}

// Save session to localStorage
function saveSession() {
  if (AppState.session) {
    localStorage.setItem('insighti_session', JSON.stringify(AppState.session));
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Check if user is already authenticated
  if (!checkAuth()) {
    route('login');
  }
  
  // populate selects
  const locSel = $('#def-location');
  const tradeSel = $('#def-trade');
  Catalog.locations.forEach(v=>{
    const opt = document.createElement('option'); opt.value=v; opt.textContent=v; locSel.appendChild(opt);
  });
  Catalog.trades.forEach(v=>{
    const opt = document.createElement('option'); opt.value=v; opt.textContent=v; tradeSel.appendChild(opt);
  });
  
  bindPhotoPicker('#photo-near', '#input-near');
  bindPhotoPicker('#photo-far', '#input-far');
  
  // Add logout functionality to user badge
  $('#badge-user').addEventListener('click', () => {
    if (AppState.session) {
      if (confirm('로그아웃하시겠습니까?')) {
        logout();
      }
    }
  });
  
  // Save session whenever it changes
  let originalSession = AppState.session;
  Object.defineProperty(AppState, 'session', {
    get() {
      return originalSession;
    },
    set(value) {
      originalSession = value;
      saveSession();
    }
  });

  // 하자 카테고리 데이터 로드
  loadDefectCategories();
});

// 기획서 요구사항 구현 함수들

// 하자 카테고리 목록 로드
async function loadDefectCategories() {
  try {
    const categories = await api.getDefectCategories();
    const select = $('#defect-category');
    
    // 기존 옵션 제거 (첫 번째 옵션 제외)
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // 카테고리별로 그룹화
    const grouped = categories.reduce((acc, category) => {
      if (!acc[category.category]) {
        acc[category.category] = [];
      }
      acc[category.category].push(category);
      return acc;
    }, {});
    
    // 카테고리별로 옵션 추가
    Object.keys(grouped).forEach(categoryName => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = categoryName;
      
      grouped[categoryName].forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });
  } catch (error) {
    console.error('하자 카테고리 로드 실패:', error);
    toast('하자 카테고리를 불러올 수 없습니다', 'error');
  }
}

// 하자명 선택 시 자동 설명 표시 (기획서 요구사항)
async function loadDefectDescription() {
  const categoryId = $('#defect-category').value;
  const descriptionArea = $('#defect-description');
  const videoSection = $('#video-section');
  
  if (!categoryId) {
    descriptionArea.classList.add('hidden');
    videoSection.classList.add('hidden');
    return;
  }
  
  try {
    setLoading(true);
    const categoryDetail = await api.getDefectCategoryDetail(categoryId);
    
    // 설명 표시
    $('#defect-description-text').textContent = categoryDetail.description;
    $('#defect-solution').textContent = `해결방법: ${categoryDetail.solution}`;
    descriptionArea.classList.remove('hidden');
    
    // 하자 내용 자동 입력
    $('#def-content').value = categoryDetail.description;
    
    // 동영상 표시 (있는 경우)
    if (categoryDetail.videos && categoryDetail.videos.length > 0) {
      const primaryVideo = categoryDetail.videos.find(v => v.is_primary) || categoryDetail.videos[0];
      loadYouTubeVideo(primaryVideo);
      videoSection.classList.remove('hidden');
    } else {
      videoSection.classList.add('hidden');
    }
    
  } catch (error) {
    console.error('하자 설명 로드 실패:', error);
    toast('하자 설명을 불러올 수 없습니다', 'error');
  } finally {
    setLoading(false);
  }
}

// YouTube 동영상 로드
function loadYouTubeVideo(videoInfo) {
  const iframe = $('#youtube-iframe');
  const videoUrl = `https://www.youtube.com/embed/${videoInfo.youtube_video_id}?start=${videoInfo.timestamp_start}&end=${videoInfo.timestamp_end}&autoplay=0&rel=0&modestbranding=1`;
  iframe.src = videoUrl;
}

// 동영상에서 하자 위치 마킹 (기획서 요구사항)
function markDefectInVideo() {
  toast('하자 위치 마킹 기능은 향후 구현 예정입니다', 'info');
  // TODO: 동영상 타임스탬프 마킹 기능 구현
}

// 재촬영 기능 (기획서 요구사항)
function retakePhotos() {
  $('#photo-near').style.backgroundImage = '';
  $('#photo-near').classList.remove('has-image');
  $('#photo-far').style.backgroundImage = '';
  $('#photo-far').classList.remove('has-image');
  AppState.photoNearKey = null;
  AppState.photoFarKey = null;
  toast('사진을 다시 촬영해주세요', 'info');
}

// 이미지 모달 관련 함수
function showImageModal(imageUrl) {
  const modal = $('#image-modal');
  const modalImg = $('#modal-image');
  if (modal && modalImg) {
    modalImg.src = imageUrl;
    modal.classList.remove('hidden');
  }
}

function closeImageModal() {
  const modal = $('#image-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}


// AI 기능 통합 함수들

// 사진 옵션 선택 다이얼로그 표시
function showPhotoOptions(type) {
  const photoTypeLabel = type === 'near' ? '전체사진' : '근접사진';
  
  // 커스텀 다이얼로그 생성
  const dialog = document.createElement('div');
  dialog.className = 'photo-options-dialog';
  dialog.innerHTML = `
    <div class="photo-options-overlay" onclick="closePhotoOptions()"></div>
    <div class="photo-options-content">
      <h3>${photoTypeLabel} 선택</h3>
      <button class="photo-option-btn camera" onclick="selectPhotoSource('${type}', 'camera')">
        📷 카메라로 촬영
      </button>
      <button class="photo-option-btn gallery" onclick="selectPhotoSource('${type}', 'gallery')">
        🖼️ 갤러리에서 선택
      </button>
      <button class="photo-option-btn cancel" onclick="closePhotoOptions()">
        취소
      </button>
    </div>
  `;
  
  document.body.appendChild(dialog);
}

// 사진 소스 선택 처리
function selectPhotoSource(type, source) {
  closePhotoOptions();
  
  // 카메라 또는 갤러리 input 트리거
  const inputId = `#input-${type}-${source}`;
  const inputElement = $(inputId);
  
  if (inputElement) {
    inputElement.click();
  } else {
    console.error('❌ Input 요소를 찾을 수 없습니다:', inputId);
  }
}

// 사진 옵션 다이얼로그 닫기
function closePhotoOptions() {
  const dialog = document.querySelector('.photo-options-dialog');
  if (dialog) {
    dialog.remove();
  }
}

// 사진 입력 트리거 (하위 호환성)
function triggerPhotoInput(type) {
  showPhotoOptions(type);
}

// 사진 업로드 처리 및 AI 감지
async function handlePhotoUpload(type, inputElement) {
  console.log('📸 handlePhotoUpload 호출됨:', type);
  
  const file = inputElement.files[0];
  if (!file) {
    console.warn('⚠️ 파일이 선택되지 않았습니다');
    return;
  }
  
  console.log('✅ 파일 선택됨:', file.name, file.type, file.size, 'bytes');
  
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
    toast(`${type === 'near' ? '전체' : '근접'}사진 처리 중...`, 'info');
    
    // 파일 미리보기 설정
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('❌ FileReader 오류:', error);
      toast('파일 읽기 실패', 'error');
    };
    
    reader.onload = async (e) => {
      console.log('✅ 파일 읽기 완료');
      
      const thumbElement = $(`#photo-${type}`);
      if (!thumbElement) {
        console.error('❌ 썸네일 요소를 찾을 수 없습니다:', `#photo-${type}`);
        return;
      }
      
      thumbElement.style.backgroundImage = `url(${e.target.result})`;
      thumbElement.classList.add('has-image');
      
      // 서버에 사진 업로드
      try {
        console.log('📤 서버에 사진 업로드 시작:', type);
        const uploadResult = await api.uploadImage(file);
        console.log('✅ 서버 업로드 완료:', uploadResult);
        
        // AppState에 photo key 저장
        if (type === 'near') {
          AppState.photoNearKey = uploadResult.filename;
        } else {
          AppState.photoFarKey = uploadResult.filename;
        }
        
        toast(`${type === 'near' ? '전체' : '근접'}사진 업로드 완료!`, 'success');
        
        // AI 감지 시작
        try {
          await analyzePhotoWithAI(file, type);
        } catch (aiError) {
          console.error('❌ AI 분석 오류:', aiError);
          // AI 오류는 무시하고 계속 진행
        }
      } catch (uploadError) {
        console.error('❌ 사진 업로드 실패:', uploadError);
        toast('사진 업로드 실패. 다시 시도해주세요.', 'error');
        // 업로드 실패 시 썸네일도 제거
        thumbElement.style.backgroundImage = '';
        thumbElement.classList.remove('has-image');
      }
    };
    
    reader.readAsDataURL(file);
    
  } catch (error) {
    console.error('❌ 사진 업로드 실패:', error);
    toast('사진 업로드 중 오류가 발생했습니다', 'error');
  }
}

// AI로 사진 분석
async function analyzePhotoWithAI(file, photoType) {
  try {
    console.log('🔍 사진 분석 시작:', file.name, file.size, 'bytes');
    
    // AI 분석 결과 영역 표시
    const aiResultsDiv = $('#ai-analysis-results');
    aiResultsDiv.innerHTML = `
      <div class="ai-loading">
        <div class="ai-loading-spinner"></div>
        <span>🤖 AI가 사진을 분석 중입니다...</span>
      </div>
    `;
    aiResultsDiv.classList.remove('hidden');
    
    // AI 감지기 확인
    if (!window.defectDetector && !window.hybridDetector) {
      console.warn('⚠️ AI 감지기가 로드되지 않았습니다. 모의 결과를 생성합니다.');
      
      // AI 감지기가 없어도 모의 결과 생성
      const mockDefects = generateQuickMockDefects();
      displayAIDetectionResults(mockDefects, photoType);
      return;
    }
    
    // 이미지 요소 생성
    const imageElement = await createImageElement(file);
    console.log('✅ 이미지 요소 생성 완료');
    
    // AI 감지 실행 (defectDetector 또는 hybridDetector 사용)
    const detector = window.defectDetector || window.hybridDetector;
    const detectedDefects = await detector.detectDefects(imageElement);
    console.log('✅ AI 감지 완료:', detectedDefects.length, '개');
    
    // 결과 표시
    displayAIDetectionResults(detectedDefects, photoType);
    
    // AI 예측 결과를 서버에 저장
    try {
      await learningSystem.savePredictionResults(file.name, detectedDefects, photoType);
    } catch (error) {
      console.error('AI 예측 결과 저장 실패:', error);
    }
    
  } catch (error) {
    console.error('AI 분석 실패:', error);
    
    // 에러 상태 표시
    const aiResultsDiv = $('#ai-analysis-results');
    aiResultsDiv.innerHTML = `
      <div class="ai-analysis-header">
        <h4>⚠️ AI 분석 실패</h4>
        <button class="button small" onclick="hideAIAnalysis()">닫기</button>
      </div>
      <p>AI 분석 중 오류가 발생했습니다. 수동으로 하자를 등록해주세요.</p>
    `;
  }
}

// 파일을 이미지 요소로 변환
function createImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 간단한 모의 하자 감지 결과 생성
function generateQuickMockDefects() {
  const allDefects = [
    { type: '벽지찢김', severity: '보통', description: '벽체부위 벽지파손은 위치별 크기별로 다르나 보수로 처리가능한' },
    { type: '벽균열', severity: '심각', description: '벽체에 발생한 균열로 건물의 구조적 문제를 나타낼 수 있음' },
    { type: '마루판들뜸', severity: '보통', description: '바닥 마루판이 들뜨거나 움직이는 현상' },
    { type: '타일균열', severity: '보통', description: '타일 표면 또는 접합부에 발생한 균열' },
    { type: '페인트벗겨짐', severity: '경미', description: '도장 표면이 벗겨지거나 박리되는 현상' },
    { type: '천장누수', severity: '심각', description: '천장에서 물이 스며나오거나 누수 흔적이 보임' },
    { type: '욕실곰팡이', severity: '보통', description: '욕실 벽면이나 천장에 발생한 곰팡이' },
    { type: '문틀변형', severity: '보통', description: '문틀이 변형되어 문이 제대로 닫히지 않음' },
    { type: '콘센트불량', severity: '심각', description: '콘센트가 제대로 작동하지 않거나 느슨함' },
    { type: '창문잠금불량', severity: '보통', description: '창문 잠금장치가 제대로 작동하지 않음' }
  ];
  
  // 랜덤으로 1-2개 선택
  const count = Math.floor(Math.random() * 2) + 1;
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * allDefects.length);
    const defect = allDefects[randomIndex];
    const confidence = (Math.random() * 0.3 + 0.6).toFixed(2); // 60-90%
    
    selected.push({
      type: defect.type,
      severity: defect.severity,
      description: defect.description,
      confidence: parseFloat(confidence)
    });
  }
  
  return selected;
}

// AI 감지 결과 표시
function displayAIDetectionResults(defects, photoType) {
  const aiResultsDiv = $('#ai-analysis-results');
  const detectedListDiv = $('#ai-detected-defects');
  
  if (defects.length === 0) {
    aiResultsDiv.innerHTML = `
      <div class="ai-analysis-header">
        <h4>✅ AI 분석 완료</h4>
        <button class="button small" onclick="hideAIAnalysis()">닫기</button>
      </div>
      <p>이 사진에서는 하자가 감지되지 않았습니다.</p>
    `;
    return;
  }
  
  // 감지된 하자들을 표시
  let defectsHTML = '';
  defects.forEach((defect, index) => {
    defectsHTML += `
      <div class="ai-defect-item" data-defect-index="${index}">
        <div class="ai-defect-header">
          <span class="ai-defect-type">${defect.type}</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="ai-severity ${defect.severity}">${defect.severity}</span>
            <span class="ai-confidence">${Math.round(defect.confidence * 100)}%</span>
          </div>
        </div>
        <div class="ai-defect-description">${defect.description}</div>
        <div class="ai-defect-actions">
          <button class="button success" onclick="useAIDetection(${index}, '${photoType}')">
            ✅ 이 결과 사용
          </button>
          <button class="button" onclick="rejectAIDetection(${index})">
            ❌ 틀렸습니다
          </button>
        </div>
      </div>
    `;
  });
  
  const aiModeMessage = window.USE_AZURE_AI 
    ? '<div class="ai-mode-badge azure">🌐 Azure OpenAI Vision</div>'
    : '<div class="ai-mode-badge mock">🎭 모의(Mock) 모드 - 실제 AI 학습 시 정확도가 향상됩니다</div>';
  
  aiResultsDiv.innerHTML = `
    <div class="ai-analysis-header">
      <h4>🤖 AI 분석 완료 - ${defects.length}개 하자 감지</h4>
      <button class="button small" onclick="hideAIAnalysis()">닫기</button>
    </div>
    ${aiModeMessage}
    <div class="ai-detected-list">
      ${defectsHTML}
    </div>
  `;
}

// AI 감지 결과 사용
function useAIDetection(defectIndex, photoType) {
  // AI 감지 결과를 현재 하자 등록 폼에 적용
  const aiResultsDiv = $('#ai-analysis-results');
  const defectItem = aiResultsDiv.querySelector(`[data-defect-index="${defectIndex}"]`);
  
  if (!defectItem) return;
  
  // 감지된 하자 정보 추출
  const defectType = defectItem.querySelector('.ai-defect-type').textContent;
  const description = defectItem.querySelector('.ai-defect-description').textContent;
  
  // 하자명 드롭다운에서 해당 항목 선택
  const categorySelect = $('#defect-category');
  const options = Array.from(categorySelect.options);
  const matchingOption = options.find(option => option.textContent === defectType);
  
  if (matchingOption) {
    categorySelect.value = matchingOption.value;
    loadDefectDescription(); // 자동 설명 로드
  }
  
  // 하자 내용 자동 입력
  $('#def-content').value = description;
  
  // 성공 피드백
  defectItem.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
      <div>AI 감지 결과가 적용되었습니다!</div>
    </div>
  `;
  
  // 학습 데이터에 긍정적 피드백 추가
  const predictionId = learningSystem.predictionCache.get(`defect-${defectIndex}`);
  if (predictionId) {
    const feedback = {
      isCorrect: true,
      feedback: '정확한 감지'
    };
    learningSystem.collectFeedback(predictionId, feedback);
  }
  
  toast('AI 감지 결과가 적용되었습니다!', 'success');
}

// AI 감지 결과 거부
function rejectAIDetection(defectIndex) {
  const aiResultsDiv = $('#ai-analysis-results');
  const defectItem = aiResultsDiv.querySelector(`[data-defect-index="${defectIndex}"]`);
  
  if (!defectItem) return;
  
  // 거부 피드백 표시
  defectItem.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
      <div>피드백이 학습에 반영됩니다.</div>
      <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
        올바른 하자를 수동으로 선택해주세요.
      </div>
    </div>
  `;
  
  // 학습 데이터에 부정적 피드백 추가
  const predictionId = learningSystem.predictionCache.get(`defect-${defectIndex}`);
  if (predictionId) {
    const feedback = {
      isCorrect: false,
      feedback: '부정확한 감지'
    };
    learningSystem.collectFeedback(predictionId, feedback);
  }
  
  toast('피드백이 AI 학습에 반영됩니다', 'info');
}

// AI 분석 결과 숨기기
function hideAIAnalysis() {
  $('#ai-analysis-results').classList.add('hidden');
}

// 학습 데이터 저장
function saveDetectionForLearning(defects, file, photoType) {
  // 감지 결과를 메모리에 저장 (실제로는 서버에 전송)
  if (!window.currentDetectionData) {
    window.currentDetectionData = [];
  }
  
  window.currentDetectionData.push({
    photoType,
    fileName: file.name,
    fileSize: file.size,
    detectedDefects: defects,
    timestamp: new Date().toISOString()
  });
}

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const userMenu = $('#user-menu');
  const badgeUser = $('#badge-user');
  
  if (userMenu && !userMenu.classList.contains('hidden')) {
    if (!userMenu.contains(e.target) && e.target !== badgeUser) {
      closeUserMenu();
    }
  }
});

// 앱 초기화
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 앱 초기화 시작');
  
  // AI 모드 설정
  // false = 모의 모드 (학습 없이 랜덤 예측)
  // true = Azure OpenAI (실제 GPT-4 Vision 사용, API 키 필요)
  window.USE_AZURE_AI = false;
  console.log(`🤖 AI 모드: ${window.USE_AZURE_AI ? 'Azure OpenAI' : '모의(Mock) 모드'}`);
  
  // 하자 카테고리 미리 로드
  try {
    await loadDefectCategories();
    console.log('✅ 하자 카테고리 로드 완료');
  } catch (error) {
    console.error('❌ 하자 카테고리 로드 실패:', error);
    toast('하자 카테고리 로드 중... 서버가 시작 중입니다 (최대 1-2분 소요)', 'info');
    // 오류가 발생해도 앱은 계속 실행되도록 함
  }
  
  // 세션 확인
  if (AppState.token) {
    try {
      const sessionData = await api.getSession();
      AppState.session = sessionData;
      route('list');
      await loadCases();
    } catch (error) {
      console.error('세션 복원 실패:', error);
      api.clearToken();
      route('login');
    }
  } else {
    route('login');
  }
  
  console.log('✅ 앱 초기화 완료');
});
