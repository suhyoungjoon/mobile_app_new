// Create Super Admin account
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // 비밀번호 해시 생성
    const password = 'admin123'; // 기본 비밀번호 (나중에 변경 필요)
    const passwordHash = await bcrypt.hash(password, 10);

    // Super Admin 생성
    console.log('👨‍💼 Creating Super Admin account...');
    
    const result = await client.query(`
      INSERT INTO admin_user (email, password_hash, name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2, is_active = true
      RETURNING id, email, name, role
    `, ['admin@insighti.com', passwordHash, 'Super Admin', 'super_admin', true]);

    console.log('✅ Super Admin account created/updated:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', result.rows[0].email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', result.rows[0].name);
    console.log('🎖️  Role:', result.rows[0].role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⚠️  보안 주의:');
    console.log('   비밀번호를 반드시 변경하세요!');
    console.log('   기본 비밀번호: admin123\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Done\n');
  }
}

createSuperAdmin();
