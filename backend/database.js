// Simple PostgreSQL connection
const { Pool } = require('pg');
const config = require('./config');

// Use DATABASE_URL if available (Render provides this), otherwise use individual config
let pool;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  // Production: Use DATABASE_URL from Render
  console.log('📊 Using DATABASE_URL for connection');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  // Development: Use individual config
  console.log('📊 Using config file for connection');
  pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false,
  });
}

// Test connection immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;
