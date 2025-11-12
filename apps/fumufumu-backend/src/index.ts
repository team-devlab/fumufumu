import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1';

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    const db = drizzle(env.DB);

    // 負荷の低いテストクエリを実行 (SELECT 1 はDB接続を確認する最も一般的な方法)
    // このクエリが成功すれば、D1との接続は正常と判断
    const _ = await db.$client.prepare('SELECT 1').all();

    return c.json({ 
      status: 'ok', 
      database: 'connected', 
      timestamp: new Date().toISOString() 
    }, 200);

  } catch (error) {
    console.error('D1 Health Check Failed:', error);
    
    return c.json({ 
      status: 'error', 
      database: 'unavailable',
      message: (error as Error).message
    }, 503);
  }
})

export default app
