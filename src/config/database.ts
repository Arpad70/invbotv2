import mysql from 'mysql2/promise';
import { config } from './index';
import { Logger } from '../utils/logger';

const logger = new Logger('Database');

export class Database {
  private pool: mysql.Pool | null = null;

  async initialize(): Promise<void> {
    try {
      this.pool = mysql.createPool(config.database);

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      logger.info('✅ Database connection successful');
    } catch (error) {
      logger.error(`❌ Database connection failed: ${error}`);
      throw error;
    }
  }

  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    return this.pool;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection closed');
    }
  }

  async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(sql, values);
      return rows as T[];
    } finally {
      connection.release();
    }
  }

  async queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, values);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, values?: any[]): Promise<{ insertId: number; affectedRows: number }> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(sql, values);
      return {
        insertId: (result as mysql.OkPacket).insertId || 0,
        affectedRows: (result as mysql.OkPacket).affectedRows || 0,
      };
    } finally {
      connection.release();
    }
  }

  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export const db = new Database();
