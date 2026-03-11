// User Service - User management and authentication
import { db } from '../config/database';
import { User } from '../types';
import { Logger } from '../utils/logger';
import crypto from 'crypto';

const logger = new Logger('UserService');

export class UserService {
  async getUserById(userId: number): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE user_id = ?';
    return await db.queryOne<User>(sql, [userId]);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = ?';
    return await db.queryOne<User>(sql, [username]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await db.queryOne<User>(sql, [email]);
  }

  async createUser(
    username: string,
    email: string,
    password: string,
    initialCapital: number = 10000
  ): Promise<User> {
    const passwordHash = this.hashPassword(password);
    const sql = `
      INSERT INTO users (username, email, password_hash, initial_capital)
      VALUES (?, ?, ?, ?)
    `;
    const result = await db.execute(sql, [username, email, passwordHash, initialCapital]);
    
    const user = await this.getUserById(result.insertId);
    if (!user) throw new Error('Failed to create user');
    
    logger.info(`User created: ${username}`);
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const passwordHash = this.hashPassword(password);
    if (user.password_hash === passwordHash) {
      // Update last login
      await db.execute('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
      return user;
    }
    return null;
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async updateUserApiKey(userId: number, platform: string, apiKey: string): Promise<void> {
    const keyMap: Record<string, string> = {
      polymarket: 'polymarket_api_key',
      kalshi: 'kalshi_api_key',
      opinion: 'opinion_api_key',
    };

    const column = keyMap[platform.toLowerCase()];
    if (!column) throw new Error(`Unknown platform: ${platform}`);

    // In production, encrypt the API key
    const sql = `UPDATE users SET ${column} = ? WHERE user_id = ?`;
    await db.execute(sql, [apiKey, userId]);
    
    logger.info(`API key updated for user ${userId} on ${platform}`);
  }

  async getAllUsers(): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE is_active = true';
    return await db.query<User>(sql);
  }
}

export const userService = new UserService();
