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
  } else if (screenName === 'inspectors') {
    loadInspectorRegistrations();
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
  
  // 점검원 승인 모달 라디오 버튼 이벤트
  $$('input[name="approval-action"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const rejectionGroup = $('#rejection-reason-group');
      if (e.target.value === 'reject') {
        rejectionGroup.style.display = 'block';
      } else {
        rejectionGroup.style.display = 'none';
      }
    });
  });
});

// ===== 점검원 관리 기능 =====

// 점검원 등록 목록 로드
async function loadInspectorRegistrations() {
  try {
    const data = await apiCall('/api/inspector-registration/admin/pending');
    
    // 통계 업데이트
    $('#inspector-total').textContent = data.total;
    $('#inspector-pending').textContent = data.pending;
    $('#inspector-approved').textContent = data.approved;
    $('#inspector-rejected').textContent = data.rejected;
    
    // 테이블 업데이트
    const tbody = $('#inspectors-tbody');
    tbody.innerHTML = '';
    
    if (data.registrations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">등록 신청이 없습니다</td></tr>';
      return;
    }
    
    data.registrations.forEach(reg => {
      const row = document.createElement('tr');
      
      const statusBadge = getStatusBadge(reg.status);
      const processedDate = reg.approved_at ? new Date(reg.approved_at).toLocaleDateString() : '-';
      
      row.innerHTML = `
        <td>#${reg.id}</td>
        <td>${reg.complex}</td>
        <td>${reg.dong}동 ${reg.ho}호</td>
        <td>${reg.inspector_name}</td>
        <td>${reg.company_name || '-'}</td>
        <td>${new Date(reg.created_at).toLocaleDateString()}</td>
        <td>${statusBadge}</td>
        <td>${processedDate}</td>
        <td>
          ${reg.status === 'pending' ? 
            `<button class="btn btn-sm btn-primary" onclick="openInspectorApprovalModal(${reg.id})">처리</button>` :
            `<button class="btn btn-sm btn-secondary" onclick="viewInspectorDetails(${reg.id})">상세</button>`
          }
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('점검원 등록 목록 로드 오류:', error);
    toast('점검원 등록 목록을 불러오는데 실패했습니다', 'error');
  }
}

// 상태 배지 생성
function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">승인 대기</span>',
    'approved': '<span class="badge badge-success">승인 완료</span>',
    'rejected': '<span class="badge badge-danger">승인 거부</span>'
  };
  return badges[status] || '<span class="badge badge-secondary">알 수 없음</span>';
}

// 점검원 승인 모달 열기
async function openInspectorApprovalModal(registrationId) {
  try {
    // 등록 정보 로드
    const data = await apiCall(`/api/inspector-registration/status/${registrationId}`);
    const reg = data.registration;
    
    // 모달 정보 업데이트
    $('#approval-registration-id').value = registrationId;
    $('#approval-inspector-info').innerHTML = `
      <div class="info-item">
        <strong>점검원:</strong> ${reg.inspector_name}
      </div>
      <div class="info-item">
        <strong>연락처:</strong> ${reg.phone}
      </div>
      <div class="info-item">
        <strong>회사명:</strong> ${reg.company_name || '-'}
      </div>
      <div class="info-item">
        <strong>자격증:</strong> ${reg.license_number || '-'}
      </div>
      <div class="info-item">
        <strong>등록 사유:</strong> ${reg.registration_reason}
      </div>
    `;
    
    // 기본값 설정
    $('input[name="approval-action"][value="approve"]').checked = true;
    $('#rejection-reason-group').style.display = 'none';
    $('#rejection-reason').value = '';
    
    // 모달 표시
    $('#inspector-approval-modal').style.display = 'flex';
    
  } catch (error) {
    console.error('점검원 승인 모달 열기 오류:', error);
    toast('점검원 정보를 불러오는데 실패했습니다', 'error');
  }
}

// 점검원 승인 모달 닫기
function closeInspectorApprovalModal() {
  $('#inspector-approval-modal').style.display = 'none';
}

// 점검원 승인/거부 처리
async function processInspectorApproval() {
  const registrationId = $('#approval-registration-id').value;
  const action = $('input[name="approval-action"]:checked').value;
  const rejectionReason = $('#rejection-reason').value.trim();
  
  if (action === 'reject' && !rejectionReason) {
    toast('거부 사유를 입력해주세요', 'error');
    return;
  }
  
  try {
    const data = await apiCall(`/api/inspector-registration/admin/${registrationId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        approved: action === 'approve',
        rejection_reason: action === 'reject' ? rejectionReason : null
      })
    });
    
    if (action === 'approve') {
      toast('점검원 등록이 승인되었습니다', 'success');
    } else {
      toast('점검원 등록이 거부되었습니다', 'warning');
    }
    
    closeInspectorApprovalModal();
    loadInspectorRegistrations();
    
  } catch (error) {
    console.error('점검원 승인/거부 처리 오류:', error);
    toast('처리 중 오류가 발생했습니다', 'error');
  }
}

// 점검원 상세 정보 보기
async function viewInspectorDetails(registrationId) {
  try {
    const data = await apiCall(`/api/inspector-registration/status/${registrationId}`);
    const reg = data.registration;
    
    const details = `
      <div class="inspector-details">
        <h3>점검원 등록 상세 정보</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>등록 ID:</label>
            <span>#${reg.id}</span>
          </div>
          <div class="detail-item">
            <label>단지:</label>
            <span>${reg.complex}</span>
          </div>
          <div class="detail-item">
            <label>세대:</label>
            <span>${reg.dong}동 ${reg.ho}호</span>
          </div>
          <div class="detail-item">
            <label>점검원명:</label>
            <span>${reg.inspector_name}</span>
          </div>
          <div class="detail-item">
            <label>연락처:</label>
            <span>${reg.phone}</span>
          </div>
          <div class="detail-item">
            <label>회사명:</label>
            <span>${reg.company_name || '-'}</span>
          </div>
          <div class="detail-item">
            <label>자격증 번호:</label>
            <span>${reg.license_number || '-'}</span>
          </div>
          <div class="detail-item">
            <label>이메일:</label>
            <span>${reg.email || '-'}</span>
          </div>
          <div class="detail-item">
            <label>등록 사유:</label>
            <span>${reg.registration_reason}</span>
          </div>
          <div class="detail-item">
            <label>신청일:</label>
            <span>${new Date(reg.created_at).toLocaleString()}</span>
          </div>
          <div class="detail-item">
            <label>처리일:</label>
            <span>${reg.approved_at ? new Date(reg.approved_at).toLocaleString() : '-'}</span>
          </div>
          <div class="detail-item">
            <label>처리자:</label>
            <span>${reg.approved_by || '-'}</span>
          </div>
          ${reg.rejection_reason ? `
            <div class="detail-item">
              <label>거부 사유:</label>
              <span>${reg.rejection_reason}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // 모달이나 팝업으로 표시 (간단하게 alert 사용)
    alert(details.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    
  } catch (error) {
    console.error('점검원 상세 정보 조회 오류:', error);
    toast('상세 정보를 불러오는데 실패했습니다', 'error');
  }
}

// 점검원 등록 목록 새로고침
function refreshInspectorRegistrations() {
  loadInspectorRegistrations();
}

