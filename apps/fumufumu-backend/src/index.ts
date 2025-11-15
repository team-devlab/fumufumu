import { Hono, Next } from 'hono'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { getDb } from './db';
import { createBetterAuth, AuthInstance } from './auth';
export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// Hono Context (Variables) の拡張:
// c.get() でアクセスするカスタムプロパティの型を定義
interface Variables {
  db: DrizzleD1Database;
  auth: AuthInstance;
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>()

// DI ミドルウェアの作成:
// DBとAuthインスタンスをコンテキストに注入するミドルウェア
// (ルート '/' と '/health' などを除く全てのリクエストに適用)
app.use('*', async (c, next) => {
  // '/' と '/health' はミドルウェアをスキップ（特に /health はDB接続のテストであり、エラーハンドリングを直接行うため）
  // BetterAuthインスタンスの生成は比較的コストが高いため、不要なルートでは避ける
  if (c.req.path === '/' || c.req.path === '/health') {
    return next();
  }

  const env = c.env;

  // コンテキストに格納
  const db = getDb(env.DB);
  c.set('db', db);

  // コンテキストに格納
  const auth = createBetterAuth(db, env);
  c.set('auth', auth);

  await next();
});


app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    // NOTE: このルートはミドルウェアをスキップするため、getDbを直接呼び出す
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

// 3. 既存ルートの修正: コンテキストからインスタンスを取得するように変更
app.on(['GET', 'POST'], '/auth/*', async (c) => {
  // ミドルウェアで設定された auth インスタンスを取得
  const auth = c.get('auth');

  // Better Auth のハンドラにリクエスト処理を委譲
  return auth.handler(c.req.raw);
});

// 3. 既存ルートの修正: コンテキストからインスタンスを取得するように変更
app.get('/api/protected', async (c) => {
  // ミドルウェアで設定された auth インスタンスを取得
  const auth = c.get('auth');

  // Better Auth の API メソッドを使ってセッションを取得
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    message: 'Welcome to the protected area!',
    // Better Auth のセッションには、まだ業務IDが注入されていない点に注意
    user: session.user
  });
});

export default app
