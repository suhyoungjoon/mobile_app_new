
// Enhanced SPA with backend API integration
const $ = (q)=>document.querySelector(q);
const $$ = (q)=>document.querySelectorAll(q);

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

function route(screen){
  $$('.screen').forEach(el=>el.classList.add('hidden'));
  $(`#${screen}`).classList.remove('hidden');
  // tab highlight
  $$('.tabbar button').forEach(b=>b.classList.remove('active'));
  if(screen==='list') $('#tab-list').classList.add('active');
  if(screen==='newdefect') $('#tab-add').classList.add('active');
  if(screen==='report') $('#tab-report').classList.add('active');
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
  toast('로그인 중... 처음 접속 시 최대 30초 소요될 수 있습니다', 'info');
  
  try {
    const response = await api.login({
      complex, dong, ho, name, phone
    });
    
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
      <button class="button ghost" onclick="route('newdefect')">하자 추가</button>
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
    renderCaseList();
    toast('새 케이스가 생성되었습니다', 'success');
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

async function onSaveDefect(){
  if (isLoading) return;
  
  const location = $('#def-location').value;
  const trade = $('#def-trade').value;
  const content = $('#def-content').value.trim();
  const memo = $('#def-memo').value.trim();
  
  if(!location || !trade || !content){
    toast('위치/세부공정/내용을 입력해 주세요', 'error');
    return;
  }

  if (!AppState.cases || AppState.cases.length === 0) {
    toast('먼저 케이스를 생성해 주세요', 'error');
    return;
  }

  setLoading(true);
  
  try {
    const latestCase = AppState.cases[0];
    
    // Upload photos if available
    let photoNearKey = null;
    let photoFarKey = null;
    
    if ($('#photo-near').dataset.src) {
      const nearFile = $('#input-near').files[0];
      if (nearFile) {
        const nearUpload = await api.uploadPhoto(nearFile, 'near');
        photoNearKey = nearUpload.key;
      }
    }
    
    if ($('#photo-far').dataset.src) {
      const farFile = $('#input-far').files[0];
      if (farFile) {
        const farUpload = await api.uploadPhoto(farFile, 'far');
        photoFarKey = farUpload.key;
      }
    }
    
    // Create defect
    const defectData = {
      case_id: latestCase.id,
      location,
      trade,
      content,
      memo,
      photo_near_key: photoNearKey,
      photo_far_key: photoFarKey
    };
    
    const newDefect = await api.createDefect(defectData);
    
    // Update local state
    if (!latestCase.defects) {
      latestCase.defects = [];
    }
    latestCase.defects.push(newDefect);
    
    // Clear form
    $('#def-content').value = '';
    $('#def-memo').value = '';
    $('#photo-near').dataset.src = '';
    $('#photo-near').textContent = '근거리';
    $('#photo-far').dataset.src = '';
    $('#photo-far').textContent = '원거리';
    $('#input-near').value = '';
    $('#input-far').value = '';
    
    toast('하자가 저장되었습니다', 'success');
    route('list');
    renderCaseList();
    
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

function bindPhotoPicker(id, inputId){
  const box = $(id);
  const input = $(inputId);
  box.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=>{
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      box.dataset.src = e.target.result;
      box.innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />';
    };
    reader.readAsDataURL(file);
  });
}

async function onSendMock(){
  if (isLoading) return;
  
  if (!AppState.cases || AppState.cases.length === 0) {
    toast('먼저 케이스를 생성해 주세요', 'error');
    return;
  }

  setLoading(true);
  
  try {
    const latestCase = AppState.cases[0];
    const result = await api.sendReport(latestCase.id);
    
    toast(`보고서가 발송되었습니다. PDF: ${result.filename}`, 'success');
    
    // Show PDF link
    if (result.pdf_url) {
      const link = document.createElement('a');
      link.href = `http://localhost:3000${result.pdf_url}`;
      link.target = '_blank';
      link.textContent = 'PDF 보고서 보기';
      link.style.display = 'block';
      link.style.marginTop = '10px';
      link.style.color = '#1a73e8';
      link.style.textDecoration = 'underline';
      
      const reportContainer = $('#report-preview');
      reportContainer.appendChild(link);
    }
    
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
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
  $('#photo-near').textContent = '전체사진';
  $('#photo-far').textContent = '근접사진';
  $('#photo-near').style.backgroundImage = '';
  $('#photo-far').style.backgroundImage = '';
  $('#input-near').value = '';
  $('#input-far').value = '';
  toast('사진을 다시 촬영해주세요', 'info');
}

// 하자 등록 화면 진입 시 고객 정보 표시 (기획서 요구사항)
function showCustomerInfo() {
  if (AppState.session) {
    const { complex, dong, ho, name } = AppState.session;
    $('#customer-details').textContent = `${dong}동 ${ho}호 ${name}`;
  }
}

// 하자 등록 화면 진입 시 호출되는 함수 수정
const originalRoute = route;
route = function(screen) {
  originalRoute(screen);
  
  if (screen === 'newdefect') {
    showCustomerInfo();
    // 하자 카테고리가 로드되지 않았다면 다시 로드
    if ($('#defect-category').children.length <= 1) {
      loadDefectCategories();
    }
  }
};

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
      toast(`${type === 'near' ? '전체' : '근접'}사진 업로드 완료!`, 'success');
      
      // AI 감지 시작
      try {
        await analyzePhotoWithAI(file, type);
      } catch (aiError) {
        console.error('❌ AI 분석 오류:', aiError);
        // AI 오류는 무시하고 계속 진행
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
    
    // AI 감지기 확인
    if (!window.defectDetector && !window.hybridDetector) {
      console.warn('⚠️ AI 감지기가 로드되지 않았습니다. AI 분석을 건너뜁니다.');
      return; // AI 없이 계속 진행
    }
    
    // AI 분석 결과 영역 표시
    const aiResultsDiv = $('#ai-analysis-results');
    aiResultsDiv.innerHTML = `
      <div class="ai-loading">
        <div class="ai-loading-spinner"></div>
        <span>🤖 AI가 사진을 분석 중입니다...</span>
      </div>
    `;
    aiResultsDiv.classList.remove('hidden');
    
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
