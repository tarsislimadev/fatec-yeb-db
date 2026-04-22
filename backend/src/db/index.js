import pg from 'pg';
import Redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL Connection Pool
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN || 2),
  max: parseInt(process.env.DATABASE_POOL_MAX || 10),
});

db.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Redis Client
export const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

// Initialize Redis connection
export async function initRedis() {
  try {
    await redis.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  }
}

// Test database connection
export async function testConnection() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}
