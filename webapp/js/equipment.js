// ===== EQUIPMENT INSPECTION FUNCTIONS (Phase 3) =====

// 장비점검 탭 전환
function showEquipmentTab(tabType) {
  // 모든 탭 비활성화
  document.querySelectorAll('.equipment-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.equipment-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // 선택된 탭 활성화
  document.querySelector(`[onclick="showEquipmentTab('${tabType}')"]`).classList.add('active');
  document.getElementById(`${tabType}-tab`).classList.remove('hidden');
}

// 열화상 사진 추가
function addThermalPhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = function(e) {
    handleThermalPhotoUpload(e.target.files[0]);
  };
  input.click();
}

// 열화상 사진 업로드 처리
async function handleThermalPhotoUpload(file) {
  if (!file) return;
  
  try {
    // 이미지 압축
    const compressedFile = await compressImage(file);
    
    // 파일 업로드
    const formData = new FormData();
    formData.append('photo', compressedFile);
    
    const uploadResponse = await api.uploadPhoto(formData);
    
    if (uploadResponse.success) {
      // 사진 그리드에 추가
      addPhotoToGrid('thermal-photos', uploadResponse.url, file.name);
    } else {
      showToast('사진 업로드에 실패했습니다', 'error');
    }
  } catch (error) {
    console.error('열화상 사진 업로드 오류:', error);
    showToast('사진 업로드 중 오류가 발생했습니다', 'error');
  }
}

// 사진 그리드에 사진 추가
function addPhotoToGrid(containerId, imageUrl, fileName) {
  const container = document.getElementById(containerId);
  const photoItem = document.createElement('div');
  photoItem.className = 'photo-item';
  
  photoItem.innerHTML = `
    <img src="${imageUrl}" alt="${fileName}" />
    <button class="photo-remove" onclick="removePhoto(this)">×</button>
  `;
  
  // 추가 버튼 앞에 삽입
  const addButton = container.querySelector('.photo-add');
  container.insertBefore(photoItem, addButton);
}

// 사진 제거
function removePhoto(button) {
  if (confirm('이 사진을 삭제하시겠습니까?')) {
    button.parentElement.remove();
  }
}

// 장비점검 폼 초기화
function resetEquipmentForm() {
  if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
    // 모든 입력 필드 초기화
    document.querySelectorAll('#equipment input, #equipment textarea, #equipment select').forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    
    // 사진 그리드 초기화
    document.querySelectorAll('.photo-item').forEach(item => {
      item.remove();
    });
    
    // 첫 번째 탭으로 이동
    showEquipmentTab('thermal');
    
    showToast('폼이 초기화되었습니다');
  }
}

// 장비점검 저장
async function saveEquipmentInspection() {
  try {
    const currentTab = document.querySelector('.equipment-tab.active').textContent.trim();
    
    // 현재 활성 탭에 따라 다른 저장 로직 실행
    switch (currentTab) {
      case '열화상':
        await saveThermalInspection();
        break;
      case '공기질':
        await saveAirInspection();
        break;
      case '라돈':
        await saveRadonInspection();
        break;
      case '레벨기':
        await saveLevelInspection();
        break;
      default:
        showToast('잘못된 탭입니다', 'error');
        return;
    }
  } catch (error) {
    console.error('장비점검 저장 오류:', error);
    showToast('저장 중 오류가 발생했습니다', 'error');
  }
}

// 열화상 점검 저장
async function saveThermalInspection() {
  const location = document.getElementById('thermal-location').value.trim();
  const trade = document.getElementById('thermal-trade').value.trim();
  const note = document.getElementById('thermal-note').value.trim();
  const result = document.getElementById('thermal-result').value;
  
  if (!location) {
    showToast('위치를 입력해주세요', 'error');
    return;
  }
  
  // 케이스 생성 또는 기존 케이스 사용
  const caseId = await ensureCaseExists('장비점검');
  
  // 열화상 점검 항목 생성
  const response = await api.createThermalInspection(caseId, location, trade, note, result);
  
  if (response.success) {
    // 열화상 사진들 업로드
    const photos = document.querySelectorAll('#thermal-photos .photo-item img');
    for (const photo of photos) {
      await api.uploadThermalPhoto(response.item.id, photo.src, '열화상 사진');
    }
    
    showToast('열화상 점검이 저장되었습니다');
    resetEquipmentForm();
  } else {
    showToast('저장에 실패했습니다', 'error');
  }
}

// 공기질 점검 저장
async function saveAirInspection() {
  const location = document.getElementById('air-location').value.trim();
  const trade = document.getElementById('air-trade').value.trim();
  const tvoc = document.getElementById('air-tvoc').value;
  const hcho = document.getElementById('air-hcho').value;
  const co2 = document.getElementById('air-co2').value;
  const note = document.getElementById('air-note').value.trim();
  const result = document.getElementById('air-result').value;
  
  if (!location) {
    showToast('위치를 입력해주세요', 'error');
    return;
  }
  
  // 케이스 생성 또는 기존 케이스 사용
  const caseId = await ensureCaseExists('장비점검');
  
  // 공기질 측정 등록
  const response = await api.createAirMeasurement(
    caseId, location, trade, 
    tvoc ? parseFloat(tvoc) : null,
    hcho ? parseFloat(hcho) : null,
    co2 ? parseFloat(co2) : null,
    note, result
  );
  
  if (response.success) {
    showToast('공기질 측정이 저장되었습니다');
    
    // 푸시 알림 발송 (점검 완료)
    try {
      await api.sendPushNotification('inspection-completed', {
        inspectionType: 'air',
        location,
        result
      });
      console.log('✅ Air inspection notification sent');
    } catch (error) {
      console.warn('⚠️ Failed to send push notification:', error);
    }
    
    resetEquipmentForm();
  } else {
    showToast('저장에 실패했습니다', 'error');
  }
}

// 라돈 점검 저장
async function saveRadonInspection() {
  const location = document.getElementById('radon-location').value.trim();
  const trade = document.getElementById('radon-trade').value.trim();
  const radon = document.getElementById('radon-value').value;
  const unit = document.getElementById('radon-unit').value;
  const note = document.getElementById('radon-note').value.trim();
  const result = document.getElementById('radon-result').value;
  
  if (!location) {
    showToast('위치를 입력해주세요', 'error');
    return;
  }
  
  if (!radon) {
    showToast('라돈 농도를 입력해주세요', 'error');
    return;
  }
  
  // 케이스 생성 또는 기존 케이스 사용
  const caseId = await ensureCaseExists('장비점검');
  
  // 라돈 측정 등록
  const response = await api.createRadonMeasurement(
    caseId, location, trade, 
    parseFloat(radon), unit, note, result
  );
  
  if (response.success) {
    showToast('라돈 측정이 저장되었습니다');
    resetEquipmentForm();
  } else {
    showToast('저장에 실패했습니다', 'error');
  }
}

// 레벨기 점검 저장
async function saveLevelInspection() {
  const location = document.getElementById('level-location').value.trim();
  const trade = document.getElementById('level-trade').value.trim();
  const leftMm = document.getElementById('level-left').value;
  const rightMm = document.getElementById('level-right').value;
  const note = document.getElementById('level-note').value.trim();
  const result = document.getElementById('level-result').value;
  
  if (!location) {
    showToast('위치를 입력해주세요', 'error');
    return;
  }
  
  if (!leftMm || !rightMm) {
    showToast('좌측과 우측 수치를 모두 입력해주세요', 'error');
    return;
  }
  
  // 케이스 생성 또는 기존 케이스 사용
  const caseId = await ensureCaseExists('장비점검');
  
  // 레벨기 측정 등록
  const response = await api.createLevelMeasurement(
    caseId, location, trade, 
    parseFloat(leftMm), parseFloat(rightMm), note, result
  );
  
  if (response.success) {
    showToast('레벨기 측정이 저장되었습니다');
    resetEquipmentForm();
  } else {
    showToast('저장에 실패했습니다', 'error');
  }
}

// 사용자 역할에 따른 UI 제어
function updateUserRoleUI(userType) {
  const body = document.body;
  
  // 기존 역할 클래스 제거
  body.classList.remove('user-resident', 'user-company', 'user-admin');
  
  // 새로운 역할 클래스 추가
  switch (userType) {
    case 'resident':
      body.classList.add('user-resident');
      break;
    case 'company':
      body.classList.add('user-company');
      break;
    case 'admin':
      body.classList.add('user-admin');
      break;
  }
  
  // 사용자 배지 업데이트
  const userBadge = document.getElementById('badge-user');
  if (userBadge) {
    switch (userType) {
      case 'resident':
        userBadge.textContent = '입주자';
        break;
      case 'company':
        userBadge.textContent = '점검원';
        break;
      case 'admin':
        userBadge.textContent = '관리자';
        break;
      default:
        userBadge.textContent = '게스트';
    }
  }
}

// 관리자 페이지로 이동
function goToAdmin() {
  window.open('/admin.html', '_blank');
}
