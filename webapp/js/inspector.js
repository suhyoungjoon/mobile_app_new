// 점검원 전용 JavaScript
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// Inspector State
const InspectorState = {
  session: null,
  currentDefectId: null,
  currentCaseId: null,
  allDefects: [],
  measurementPhotos: {} // 측정 타입별 사진 정보 {air: {file: File, url: string}, radon: {...}, level: {...}}
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
    route('defect-list');
  }
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
  
  // 로딩 표시 (버튼은 비활성화하지 않고 로딩 메시지만 표시)
  const container = $('#defect-list-container');
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
    
    // loadAllDefects 함수가 정의되어 있는지 확인
    if (typeof loadAllDefects === 'function') {
      try {
        console.log('🔍 loadAllDefects 호출 직전');
        await loadAllDefects();
        console.log('✅ 하자목록 로드 완료');
      } catch (error) {
        console.error('❌ 하자목록 로드 실패:', error);
        console.error('에러 스택:', error.stack);
      }
    } else {
      console.error('❌ loadAllDefects 함수가 정의되지 않았습니다!');
      // 직접 하자목록 조회 시도
      try {
        console.log('🔄 직접 하자목록 조회 시도...');
        await loadAllDefectsDirectly();
      } catch (error) {
        console.error('❌ 직접 하자목록 조회 실패:', error);
      }
    }
    
    console.log('✅ 자동 로그인 완료, 하자목록 화면으로 이동');
    route('defect-list');
    
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
          <div class="hr"></div>
          <div class="button-group" style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="button success" style="flex: 1;" onclick="openDefectInspection('${defect.id}', '${defect.case_id}')">
              📊 점검결과 입력
            </button>
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

// 모든 하자 목록 조회
async function loadAllDefects() {
  console.log('🔍 loadAllDefects() 함수 호출됨');
  console.log('🔍 InspectorState.session:', InspectorState.session ? '있음' : '없음');
  
  if (!InspectorState.session) {
    console.log('⚠️ 세션이 없어서 하자목록을 로드할 수 없습니다');
    // 세션이 없으면 로딩 메시지 표시
    const container = $('#defect-list-container');
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #666;">로그인 중...</div>
        </div>
      `;
    }
    return;
  }
  
  // 로딩 표시 (버튼은 비활성화하지 않음 - setLoading 사용 안 함)
  const container = $('#defect-list-container');
  console.log('🔍 container 요소:', container ? '찾음' : '없음');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #666;">하자목록을 불러오는 중...</div>
      </div>
    `;
    console.log('✅ 로딩 메시지 표시 완료');
  }
  
  try {
    console.log('📡 모든 하자 조회 시작...');
    console.log('🔍 api 객체:', api ? '있음' : '없음');
    console.log('🔍 api.baseURL:', api ? api.baseURL : 'N/A');
    
    // 점검원용 API로 모든 하자 조회
    console.log('📋 점검원용 API로 모든 하자 조회 시도...');
    const result = await api.request('/defects/all');
    
    console.log('✅ 점검원용 API 응답:', result);
    console.log('📊 조회된 하자 수:', result.defects ? result.defects.length : 0);
    
    if (!result.defects || result.defects.length === 0) {
      console.log('⚠️ 조회된 하자가 없습니다');
      if (container) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 40px;">
            <div style="color: #666;">등록된 하자가 없습니다.</div>
            <div style="color: #999; font-size: 12px; margin-top: 8px;">하자를 등록하면 여기에 표시됩니다.</div>
          </div>
        `;
      }
      InspectorState.allDefects = [];
      InspectorState.currentCaseId = null;
      return;
    }
    
    // Admin API 응답을 점검원 화면 형식으로 변환
    const allDefects = result.defects.map(d => ({
      id: d.id,
      case_id: d.case_id,
      case_type: d.case_type,
      location: d.location,
      trade: d.trade,
      content: d.content,
      memo: d.memo,
      created_at: d.created_at,
      case_created_at: d.created_at,
      photos: d.photos || [] // Admin API 응답에 photos가 있을 수 있음
    }));
    
    console.log('✅ 총 조회된 하자 수:', allDefects.length);
    InspectorState.allDefects = allDefects;
    
    // 첫 번째 하자의 케이스 ID를 기본으로 설정 (보고서 생성용)
    if (allDefects.length > 0 && !InspectorState.currentCaseId) {
      InspectorState.currentCaseId = allDefects[0].case_id;
      console.log('✅ 기본 케이스 ID 설정:', InspectorState.currentCaseId);
    }
    
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
    if (!defectsWithInspections || defectsWithInspections.length === 0) {
      if (container) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 40px;">
            <div style="color: #666;">등록된 하자가 없습니다.</div>
          </div>
        `;
      }
    } else {
      if (container) {
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
    }
    
  } catch (error) {
    console.error('하자목록 조회 오류:', error);
    toast('하자목록을 불러오는데 실패했습니다', 'error');
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="color: #e74c3c;">하자목록을 불러오는데 실패했습니다.</div>
          <div style="color: #999; font-size: 12px; margin-top: 8px;">페이지를 새로고침해주세요.</div>
        </div>
      `;
    }
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
      
      response = await api.createThermalInspectionForDefect(
        caseId, defectId, location, '', note, 'normal'
      );
      
    } else {
      toast('잘못된 측정 타입입니다', 'error');
      return;
    }
    
    if (response && response.success) {
      // 측정값 저장 성공 후 사진 업로드 (사진이 있는 경우)
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
  console.log('🚀 점검원 화면 초기화 시작');
  
  // API 클라이언트 확인
  if (typeof api === 'undefined') {
    console.error('❌ API 클라이언트가 로드되지 않았습니다. api.js가 먼저 로드되어야 합니다.');
    return;
  }
  console.log('✅ API 클라이언트 확인 완료');
  
  // 모든 화면 숨기기
  $$('.screen').forEach(el => el.classList.add('hidden'));
  
  // 먼저 하자목록 화면 표시 (로딩 중에도 화면이 보이도록)
  const defectListScreen = $('#defect-list');
  if (defectListScreen) {
    defectListScreen.classList.remove('hidden');
    console.log('✅ 하자목록 화면 표시');
  } else {
    console.error('❌ 하자목록 화면을 찾을 수 없습니다');
  }
  
  // 초기 로딩 메시지 표시 (버튼은 그대로 유지)
  const container = $('#defect-list-container');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="color: #666;">점검원 계정으로 로그인 중...</div>
        <div style="color: #999; font-size: 12px; margin-top: 8px;">잠시만 기다려주세요</div>
      </div>
    `;
    console.log('✅ 로딩 메시지 표시');
  } else {
    console.error('❌ 하자목록 컨테이너를 찾을 수 없습니다');
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
          
          // 하자목록 로드
          console.log('📋 하자목록 로드 시작...');
          await loadAllDefects();
          
          console.log('✅ 세션 복원 완료, 하자목록 화면으로 이동');
          route('defect-list');
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

