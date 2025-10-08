// Simple database migration script
const fs = require('fs');
const path = require('path');
const pool = require('../database');

async function runMigration() {
  console.log('🔄 Running database migration...');
  
  try {
    const client = await pool.connect();
    
    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'init-db.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate key')) {
            console.warn('⚠️  Warning:', error.message);
          }
        }
      }
    }
    
    client.release();
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
