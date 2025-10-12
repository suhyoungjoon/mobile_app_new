// Admin Dashboard JavaScript
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// API Base URL
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://insighti-backend-production-bda8.up.railway.app';

// Admin State
const AdminState = {
  token: null,
  admin: null,
  currentUserId: null,
  currentDefectId: null,
  resolutionPhotos: []
};

// API 헬퍼
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (AdminState.token) {
    headers['Authorization'] = `Bearer ${AdminState.token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API 요청 실패');
  }
  
  return response.json();
}

// Toast 메시지
function toast(message, type = 'info') {
  const toastEl = $('#toast');
  toastEl.textContent = message;
  toastEl.className = 'toast show';
  
  if (type === 'success') {
    toastEl.style.background = '#27ae60';
  } else if (type === 'error') {
    toastEl.style.background = '#e74c3c';
  } else {
    toastEl.style.background = '#2c3e50';
  }
  
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

// 로그인
async function adminLogin() {
  const email = $('#admin-email').value.trim();
  const password = $('#admin-password').value;
  
  if (!email || !password) {
    toast('이메일과 비밀번호를 입력하세요', 'error');
    return;
  }
  
  try {
    const result = await apiCall('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    AdminState.token = result.token;
    AdminState.admin = result.admin;
    
    localStorage.setItem('admin_token', result.token);
    localStorage.setItem('admin_info', JSON.stringify(result.admin));
    
    $('#login-screen').classList.add('hidden');
    $('#admin-dashboard').classList.remove('hidden');
    $('#admin-name').textContent = result.admin.name;
    
    toast('로그인 성공!', 'success');
    
    // 대시보드 로드
    showScreen('dashboard');
    loadDashboardStats();
    
  } catch (error) {
    console.error('Login error:', error);
    toast(error.message || '로그인 실패', 'error');
  }
}

// 로그아웃
function adminLogout() {
  if (!confirm('로그아웃하시겠습니까?')) return;
  
  AdminState.token = null;
  AdminState.admin = null;
  
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_info');
  
  $('#admin-dashboard').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  
  $('#admin-email').value = '';
  $('#admin-password').value = '';
}

// 화면 전환
function showScreen(screenName) {
  // 모든 화면 숨기기
  $$('.screen').forEach(s => s.classList.add('hidden'));
  
  // 선택된 화면 표시
  $(`#screen-${screenName}`).classList.remove('hidden');
  
  // 메뉴 활성화
  $$('.menu-item').forEach(m => m.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  // 데이터 로드
  if (screenName === 'dashboard') {
    loadDashboardStats();
  } else if (screenName === 'users') {
    loadUsers();
  } else if (screenName === 'defects') {
    loadDefects();
  }
}

// 대시보드 통계 로드
async function loadDashboardStats() {
  try {
    const stats = await apiCall('/api/admin/dashboard/stats');
    
    $('#stat-users').textContent = stats.total_users || 0;
    $('#stat-defects').textContent = stats.total_defects || 0;
    $('#stat-pending').textContent = stats.pending_defects || 0;
    $('#stat-resolved').textContent = stats.total_resolutions || 0;
    
    // 최근 하자 로드
    loadRecentDefects();
    
  } catch (error) {
    console.error('Load stats error:', error);
    toast('통계 로드 실패', 'error');
  }
}

// 최근 하자 목록
async function loadRecentDefects() {
  try {
    const result = await apiCall('/api/admin/defects?limit=5');
    
    const container = $('#recent-defects');
    
    if (!result.defects || result.defects.length === 0) {
      container.innerHTML = '<p class="text-muted">등록된 하자가 없습니다</p>';
      return;
    }
    
    container.innerHTML = result.defects.map(d => `
      <div style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">
        <div><strong>${d.location} - ${d.trade}</strong></div>
        <div style="font-size: 13px; color: #7f8c8d;">
          ${d.complex_name} ${d.dong}동 ${d.ho}호 (${d.resident_name})
        </div>
        <div style="font-size: 12px; color: #95a5a6;">
          ${new Date(d.created_at).toLocaleDateString('ko-KR')}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Load recent defects error:', error);
  }
}

// 사용자 목록 로드
async function loadUsers() {
  try {
    const result = await apiCall('/api/admin/users?limit=100');
    
    const tbody = $('#users-tbody');
    
    if (!result.users || result.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">등록된 사용자가 없습니다</td></tr>';
      return;
    }
    
    tbody.innerHTML = result.users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.complex_name}</td>
        <td>${u.dong}</td>
        <td>${u.ho}</td>
        <td>${u.resident_name}</td>
        <td>${u.phone}</td>
        <td>${u.total_defects || 0}건</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="editUser(${u.id})">수정</button>
          <button class="btn btn-secondary btn-small" onclick="manageTokens(${u.id})">토큰</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Load users error:', error);
    toast('사용자 목록 로드 실패', 'error');
  }
}

// 사용자 검색
async function searchUsers() {
  const search = $('#user-search').value.trim();
  
  try {
    const result = await apiCall(`/api/admin/users?search=${encodeURIComponent(search)}&limit=100`);
    
    const tbody = $('#users-tbody');
    tbody.innerHTML = result.users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.complex_name}</td>
        <td>${u.dong}</td>
        <td>${u.ho}</td>
        <td>${u.resident_name}</td>
        <td>${u.phone}</td>
        <td>${u.total_defects || 0}건</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="editUser(${u.id})">수정</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Search users error:', error);
  }
}

// 사용자 수정
async function editUser(userId) {
  try {
    const user = await apiCall(`/api/admin/users/${userId}`);
    
    AdminState.currentUserId = userId;
    
    $('#modal-complex').value = user.complex_name;
    $('#modal-dong').value = user.dong;
    $('#modal-ho').value = user.ho;
    $('#modal-name').value = user.resident_name;
    $('#modal-phone').value = user.phone;
    
    $('#user-modal').classList.add('show');
    
  } catch (error) {
    console.error('Load user error:', error);
    toast('사용자 정보 로드 실패', 'error');
  }
}

function closeUserModal() {
  $('#user-modal').classList.remove('show');
  AdminState.currentUserId = null;
}

async function saveUser() {
  if (!AdminState.currentUserId) return;
  
  const name = $('#modal-name').value.trim();
  const phone = $('#modal-phone').value.trim();
  
  try {
    await apiCall(`/api/admin/users/${AdminState.currentUserId}`, {
      method: 'PUT',
      body: JSON.stringify({ resident_name: name, phone })
    });
    
    toast('사용자 정보 수정 완료', 'success');
    closeUserModal();
    loadUsers();
    
  } catch (error) {
    console.error('Save user error:', error);
    toast(error.message || '사용자 정보 수정 실패', 'error');
  }
}

// 토큰 관리
async function manageTokens(userId) {
  if (!confirm('이 세대에 새 토큰을 발급하시겠습니까? (30일 유효)')) return;
  
  try {
    await apiCall(`/api/admin/users/${userId}/tokens`, {
      method: 'POST',
      body: JSON.stringify({ days: 30 })
    });
    
    toast('토큰 발급 완료', 'success');
    
  } catch (error) {
    console.error('Token error:', error);
    toast('토큰 발급 실패', 'error');
  }
}

// 하자 목록 로드
async function loadDefects() {
  try {
    const result = await apiCall('/api/admin/defects?limit=100');
    
    const tbody = $('#defects-tbody');
    
    if (!result.defects || result.defects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">등록된 하자가 없습니다</td></tr>';
      return;
    }
    
    tbody.innerHTML = result.defects.map(d => `
      <tr>
        <td style="font-size: 11px;">${d.id}</td>
        <td>${d.complex_name}</td>
        <td>${d.dong}-${d.ho}</td>
        <td>${d.location}</td>
        <td>${d.trade}</td>
        <td>${new Date(d.created_at).toLocaleDateString('ko-KR')}</td>
        <td>
          ${d.resolution_id 
            ? '<span class="badge badge-success">처리완료</span>' 
            : '<span class="badge badge-warning">미처리</span>'}
        </td>
        <td>
          <button class="btn btn-primary btn-small" onclick="openResolutionModal('${d.id}')">처리등록</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Load defects error:', error);
    toast('하자 목록 로드 실패', 'error');
  }
}

// 하자 검색
async function searchDefects() {
  const search = $('#defect-search').value.trim();
  
  try {
    const result = await apiCall(`/api/admin/defects?search=${encodeURIComponent(search)}&limit=100`);
    
    const tbody = $('#defects-tbody');
    tbody.innerHTML = result.defects.map(d => `
      <tr>
        <td style="font-size: 11px;">${d.id}</td>
        <td>${d.complex_name}</td>
        <td>${d.dong}-${d.ho}</td>
        <td>${d.location}</td>
        <td>${d.trade}</td>
        <td>${new Date(d.created_at).toLocaleDateString('ko-KR')}</td>
        <td>
          ${d.resolution_id 
            ? '<span class="badge badge-success">처리완료</span>' 
            : '<span class="badge badge-warning">미처리</span>'}
        </td>
        <td>
          <button class="btn btn-primary btn-small" onclick="openResolutionModal('${d.id}')">처리등록</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Search defects error:', error);
  }
}

// 처리 결과 모달 열기
async function openResolutionModal(defectId) {
  AdminState.currentDefectId = defectId;
  AdminState.resolutionPhotos = [];
  
  // 기존 처리 결과 로드
  try {
    const resolution = await apiCall(`/api/admin/defects/${defectId}/resolution`);
    
    if (resolution) {
      $('#resolution-memo').value = resolution.memo || '';
      $('#resolution-contractor').value = resolution.contractor || '';
      $('#resolution-worker').value = resolution.worker || '';
      $('#resolution-cost').value = resolution.cost || '';
      
      // 기존 사진 표시
      if (resolution.resolution_photos && resolution.resolution_photos.length > 0) {
        AdminState.resolutionPhotos = resolution.resolution_photos;
        updatePhotosGrid();
      }
    } else {
      // 새로운 처리 결과
      $('#resolution-memo').value = '';
      $('#resolution-contractor').value = '';
      $('#resolution-worker').value = '';
      $('#resolution-cost').value = '';
    }
    
  } catch (error) {
    console.error('Load resolution error:', error);
  }
  
  $('#resolution-defect-id').value = defectId;
  $('#resolution-modal').classList.add('show');
}

function closeResolutionModal() {
  $('#resolution-modal').classList.remove('show');
  AdminState.currentDefectId = null;
  AdminState.resolutionPhotos = [];
}

// 처리 후 사진 처리
async function handleResolutionPhotos(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    try {
      // 사진 업로드 (기존 upload API 사용)
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`${API_BASE}/api/upload/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AdminState.token}`
        },
        body: formData
      });
      
      const result = await response.json();
      AdminState.resolutionPhotos.push(result.filename);
      
      updatePhotosGrid();
      
    } catch (error) {
      console.error('Upload photo error:', error);
      toast('사진 업로드 실패', 'error');
    }
  }
}

function updatePhotosGrid() {
  const grid = $('#resolution-photos-grid');
  
  grid.innerHTML = AdminState.resolutionPhotos.map((photo, index) => `
    <div class="photo-item">
      <img src="${API_BASE}/uploads/${photo}" alt="처리 후 사진" />
      <div style="position: absolute; top: 5px; right: 5px;">
        <button 
          onclick="removeResolutionPhoto(${index})" 
          style="background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px;"
        >×</button>
      </div>
    </div>
  `).join('') + `
    <div class="photo-item" onclick="$('#resolution-photo-input').click()">
      <div class="add-icon">+</div>
    </div>
  `;
}

function removeResolutionPhoto(index) {
  AdminState.resolutionPhotos.splice(index, 1);
  updatePhotosGrid();
}

// 처리 결과 저장
async function saveResolution() {
  if (!AdminState.currentDefectId) return;
  
  const memo = $('#resolution-memo').value.trim();
  const contractor = $('#resolution-contractor').value.trim();
  const worker = $('#resolution-worker').value.trim();
  const cost = parseInt($('#resolution-cost').value) || null;
  
  try {
    await apiCall(`/api/admin/defects/${AdminState.currentDefectId}/resolution`, {
      method: 'POST',
      body: JSON.stringify({
        memo,
        contractor,
        worker,
        cost,
        resolution_photos: AdminState.resolutionPhotos
      })
    });
    
    toast('처리 결과 저장 완료', 'success');
    closeResolutionModal();
    loadDefects();
    loadDashboardStats();
    
  } catch (error) {
    console.error('Save resolution error:', error);
    toast(error.message || '처리 결과 저장 실패', 'error');
  }
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
  // 저장된 토큰 확인
  const savedToken = localStorage.getItem('admin_token');
  const savedAdmin = localStorage.getItem('admin_info');
  
  if (savedToken && savedAdmin) {
    AdminState.token = savedToken;
    AdminState.admin = JSON.parse(savedAdmin);
    
    $('#login-screen').classList.add('hidden');
    $('#admin-dashboard').classList.remove('hidden');
    $('#admin-name').textContent = AdminState.admin.name;
    
    loadDashboardStats();
  }
  
  // Enter 키로 로그인
  $('#admin-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      adminLogin();
    }
  });
});

