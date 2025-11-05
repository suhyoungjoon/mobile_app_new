// Push Notification System Test Script
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testPushNotificationSystem() {
  console.log('🔔 푸시 알림 시스템 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. 데이터베이스 스키마 확인
    console.log('1️⃣ 데이터베이스 스키마 확인...');
    
    const schemaCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('push_subscription', 'push_notification_log', 'push_notification_settings')
    `);
    
    console.log('✅ 푸시 알림 테이블 확인:', schemaCheck.rows.map(r => r.table_name));
    
    // 2. 샘플 구독 데이터 생성
    console.log('2️⃣ 샘플 구독 데이터 생성...');
    
    const sampleSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key'
    };
    
    // 테스트용 세대 조회
    const householdResult = await pool.query('SELECT id, complex_id, dong, ho, resident_name, user_type FROM household LIMIT 1');
    
    if (householdResult.rows.length === 0) {
      console.log('⚠️ 테스트용 세대 데이터가 없습니다. 샘플 데이터를 생성합니다.');
      
      // 샘플 세대 생성
      await pool.query(`
        INSERT INTO household (complex_id, dong, ho, resident_name, phone, user_type)
        VALUES (1, '101', '1203', '테스트사용자', '010-1234-5678', 'resident')
        ON CONFLICT DO NOTHING
      `);
      
      const newHousehold = await pool.query('SELECT id FROM household WHERE dong = $1 AND ho = $2', ['101', '1203']);
      console.log('✅ 테스트 세대 생성:', newHousehold.rows[0].id);
    }
    
    const household = householdResult.rows[0];
    
    // 구독 정보 삽입
    await pool.query(`
      INSERT INTO push_subscription (
        household_id, complex_id, dong, ho, name, user_type,
        endpoint, p256dh, auth, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (household_id, endpoint) 
      DO UPDATE SET 
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = now()
    `, [
      household.id,
      household.complex_id,
      household.dong,
      household.ho,
      household.resident_name,
      household.user_type,
      sampleSubscription.endpoint,
      sampleSubscription.p256dh,
      sampleSubscription.auth,
      'Test User Agent',
      new Date().toISOString()
    ]);
    
    console.log('✅ 샘플 구독 데이터 생성 완료');
    
    // 3. 알림 설정 확인
    console.log('3️⃣ 알림 설정 확인...');
    
    const settingsResult = await pool.query(`
      SELECT * FROM push_notification_settings 
      WHERE household_id = $1
    `, [household.id]);
    
    if (settingsResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO push_notification_settings (
          household_id, defect_notifications, inspection_notifications, 
          inspector_notifications, report_notifications
        ) VALUES ($1, true, true, true, true)
      `, [household.id]);
      console.log('✅ 알림 설정 생성 완료');
    } else {
      console.log('✅ 기존 알림 설정 확인:', settingsResult.rows[0]);
    }
    
    // 4. API 엔드포인트 테스트
    console.log('4️⃣ API 엔드포인트 테스트...');
    
    const baseUrl = 'https://mobile-app-new.onrender.com';
    
    // VAPID 키 조회 테스트
    try {
      const vapidResponse = await fetch(`${baseUrl}/api/push/vapid-key`);
      if (vapidResponse.ok) {
        const vapidData = await vapidResponse.json();
        console.log('✅ VAPID 키 조회 성공:', vapidData.publicKey ? '키 존재' : '키 없음');
      } else {
        console.log('❌ VAPID 키 조회 실패:', vapidResponse.status);
      }
    } catch (error) {
      console.log('❌ VAPID 키 조회 오류:', error.message);
    }
    
    // 5. 통계 조회
    console.log('5️⃣ 푸시 알림 통계...');
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN user_type = 'resident' THEN 1 END) as resident_subscriptions,
        COUNT(CASE WHEN user_type = 'company' THEN 1 END) as company_subscriptions,
        COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_subscriptions
      FROM push_subscription
    `);
    
    console.log('📊 구독 통계:', statsResult.rows[0]);
    
    const logStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_notifications,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications
      FROM push_notification_log
    `);
    
    console.log('📊 알림 발송 통계:', logStatsResult.rows[0]);
    
    // 6. 테스트 완료
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 푸시 알림 시스템 테스트 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 다음 단계:');
    console.log('1. VAPID 키 생성 및 환경변수 설정');
    console.log('2. 백엔드 서버 재시작');
    console.log('3. 프론트엔드에서 푸시 알림 활성화');
    console.log('4. 실제 알림 발송 테스트');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await pool.end();
  }
}

// VAPID 키 생성 함수
function generateVapidKeys() {
  const webpush = require('web-push');
  
  console.log('🔑 VAPID 키 생성...');
  
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 생성된 VAPID 키:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Public Key:', vapidKeys.publicKey);
  console.log('Private Key:', vapidKeys.privateKey);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n📝 환경변수 설정:');
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  
  return vapidKeys;
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generate-keys')) {
    generateVapidKeys();
  } else {
    await testPushNotificationSystem();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPushNotificationSystem,
  generateVapidKeys
};
