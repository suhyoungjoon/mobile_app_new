// VAPID 키 생성 스크립트
const webpush = require('web-push');

console.log('🔑 VAPID 키 생성 중...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID 키 생성 완료!');
  console.log('');
  console.log('📋 생성된 키:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Public Key:');
  console.log(vapidKeys.publicKey);
  console.log('');
  console.log('Private Key:');
  console.log(vapidKeys.privateKey);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📝 Render 환경변수 설정:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('');
  console.log('💡 다음 단계:');
  console.log('1. Render Dashboard → Environment');
  console.log('2. 위 키 값을 환경변수로 추가');
  console.log('3. 서비스 재배포');
  
} catch (error) {
  console.error('❌ VAPID 키 생성 실패:', error);
  process.exit(1);
}
