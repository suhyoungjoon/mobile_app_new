// Inspector Registration Functions
let currentRegistrationId = null;

// 점검원 등록 폼 초기화
function resetInspectorForm() {
  if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
    document.getElementById('inspector-registration-form').reset();
    showToast('폼이 초기화되었습니다');
  }
}

// 점검원 등록 신청
async function submitInspectorRegistration(event) {
  event.preventDefault();
  
  const formData = {
    complex: document.getElementById('reg-complex').value.trim(),
    dong: document.getElementById('reg-dong').value.trim(),
    ho: document.getElementById('reg-ho').value.trim(),
    inspector_name: document.getElementById('reg-name').value.trim(),
    phone: document.getElementById('reg-phone').value.trim(),
    company_name: document.getElementById('reg-company').value.trim(),
    license_number: document.getElementById('reg-license').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    registration_reason: document.getElementById('reg-reason').value.trim()
  };
  
  // 필수 필드 검증
  if (!formData.complex || !formData.dong || !formData.ho || !formData.inspector_name || !formData.phone || !formData.registration_reason) {
    showToast('필수 필드를 모두 입력해주세요', 'error');
    return;
  }
  
  // 전화번호 형식 검증
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  if (!phoneRegex.test(formData.phone)) {
    showToast('전화번호는 010-0000-0000 형식으로 입력해주세요', 'error');
    return;
  }
  
  try {
    showToast('등록 신청 중...', 'info');
    
    const response = await fetch('/api/inspector-registration/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.status === 201 && data.success) {
      currentRegistrationId = data.registration.id;
      showToast('점검원 등록 신청이 완료되었습니다!', 'success');
      
      // 등록 상태 확인 화면으로 이동
      setTimeout(() => {
        route('registration-status');
        loadRegistrationStatus(currentRegistrationId);
      }, 1500);
      
    } else if (response.status === 409) {
      // 중복 등록
      if (data.registration_id) {
        currentRegistrationId = data.registration_id;
        showToast('이미 등록 신청이 진행 중입니다. 상태를 확인해주세요.', 'warning');
        setTimeout(() => {
          route('registration-status');
          loadRegistrationStatus(currentRegistrationId);
        }, 1500);
      } else {
        showToast(data.error, 'error');
      }
    } else {
      showToast(data.error || '등록 신청에 실패했습니다', 'error');
    }
    
  } catch (error) {
    console.error('점검원 등록 오류:', error);
    showToast('등록 신청 중 오류가 발생했습니다', 'error');
  }
}

// 등록 상태 로드
async function loadRegistrationStatus(registrationId) {
  const statusContent = document.getElementById('status-content');
  
  if (!registrationId) {
    statusContent.innerHTML = `
      <div class="status-loading">
        <div class="loading-spinner"></div>
        <p>등록 ID가 없습니다</p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`/api/inspector-registration/status/${registrationId}`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      renderRegistrationStatus(data.registration);
    } else {
      statusContent.innerHTML = `
        <div class="status-card">
          <div class="status-message rejected">
            <strong>오류:</strong> ${data.error || '등록 상태를 불러올 수 없습니다'}
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('등록 상태 조회 오류:', error);
    statusContent.innerHTML = `
      <div class="status-card">
        <div class="status-message rejected">
          <strong>오류:</strong> 등록 상태 조회 중 문제가 발생했습니다
        </div>
      </div>
    `;
  }
}

// 등록 상태 렌더링
function renderRegistrationStatus(registration) {
  const statusContent = document.getElementById('status-content');
  
  let statusIcon, statusTitle, statusMessage, statusClass;
  
  switch (registration.status) {
    case 'pending':
      statusIcon = '⏳';
      statusTitle = '승인 대기 중';
      statusMessage = '관리자 승인을 기다리고 있습니다. 승인 후 장비점검 기능을 사용할 수 있습니다.';
      statusClass = 'pending';
      break;
    case 'approved':
      statusIcon = '✅';
      statusTitle = '승인 완료';
      statusMessage = '점검원 등록이 승인되었습니다! 이제 장비점검 기능을 사용할 수 있습니다.';
      statusClass = 'approved';
      break;
    case 'rejected':
      statusIcon = '❌';
      statusTitle = '등록 거부';
      statusMessage = `등록이 거부되었습니다. 사유: ${registration.rejection_reason || '사유 없음'}`;
      statusClass = 'rejected';
      break;
    default:
      statusIcon = '❓';
      statusTitle = '알 수 없는 상태';
      statusMessage = '등록 상태를 확인할 수 없습니다.';
      statusClass = 'pending';
  }
  
  const approvedDate = registration.approved_at ? new Date(registration.approved_at).toLocaleString() : '-';
  const createdDate = new Date(registration.created_at).toLocaleString();
  
  statusContent.innerHTML = `
    <div class="status-card">
      <div class="status-header">
        <div class="status-icon ${statusClass}">${statusIcon}</div>
        <h3 class="status-title">${statusTitle}</h3>
      </div>
      
      <div class="status-details">
        <div class="status-detail">
          <div class="status-detail-label">등록 ID</div>
          <div class="status-detail-value">#${registration.id}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">단지</div>
          <div class="status-detail-value">${registration.complex}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">동/호</div>
          <div class="status-detail-value">${registration.dong}동 ${registration.ho}호</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">점검원</div>
          <div class="status-detail-value">${registration.inspector_name}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">연락처</div>
          <div class="status-detail-value">${registration.phone}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">회사명</div>
          <div class="status-detail-value">${registration.company_name || '-'}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">신청일</div>
          <div class="status-detail-value">${createdDate}</div>
        </div>
        <div class="status-detail">
          <div class="status-detail-label">처리일</div>
          <div class="status-detail-value">${approvedDate}</div>
        </div>
      </div>
      
      <div class="status-message ${statusClass}">
        ${statusMessage}
      </div>
      
      ${registration.status === 'approved' ? `
        <div style="margin-top: 16px; text-align: center;">
          <button class="button success" onclick="location.reload()">
            장비점검 시작하기
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// 폼 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('inspector-registration-form');
  if (form) {
    form.addEventListener('submit', submitInspectorRegistration);
  }
  
  // 로컬 스토리지에서 등록 ID 복원
  const savedRegistrationId = localStorage.getItem('inspector_registration_id');
  if (savedRegistrationId) {
    currentRegistrationId = savedRegistrationId;
  }
});

// 등록 ID 저장
function saveRegistrationId(registrationId) {
  currentRegistrationId = registrationId;
  localStorage.setItem('inspector_registration_id', registrationId);
}

// 등록 ID 삭제
function clearRegistrationId() {
  currentRegistrationId = null;
  localStorage.removeItem('inspector_registration_id');
}
