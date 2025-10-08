
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
});
