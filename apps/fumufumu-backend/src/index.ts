import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import { createBetterAuth, type AuthInstance } from '@/auth';
import type { D1Database } from '@cloudflare/workers-types';

import * as authSchema from '@/db/schema/auth';
import * as userSchema from '@/db/schema/user';
import * as consultationsSchema from '@/db/schema/consultations';

import { authRouter } from '@/routes/auth.routes';
import { consultationsRoute } from '@/routes/consultations.controller';
import { protectedRouter } from '@/routes/protected.routes';
import type { ConsultationService } from '@/services/consultation.service';

// Drizzle ORMのスキーマを統合
const schema = {
  ...authSchema,
  ...userSchema,
  ...consultationsSchema,
}

export type DbInstance = DrizzleD1Database<typeof schema>;

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  COOKIE_DOMAIN?: string;
}

// Hono Context (Variables) の拡張
export interface Variables {
  auth: AuthInstance;
  appUserId: number;
  db: DbInstance;
  consultationService: ConsultationService;
}

// Hono Bindingsの型定義（他のファイルで使用）
export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};

const app = new Hono<AppBindings>()

import { AppError } from "@/errors/AppError";
import { ZodError } from "zod";

// ============================================
// グローバルエラーハンドリング
// ============================================
app.onError((err, c) => {
  // 1. AppError (意図的に投げた既知のエラー) の場合
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.name,
        message: err.message,
      },
      // AppErrorが持っている statusCode をそのまま使う
      err.statusCode as any 
    );
  }

  // 2. ZodError (手動でparseした場合など) の場合
  if (err instanceof ZodError) {
    return c.json(
      {
        error: "ValidationError",
        message: "入力内容に誤りがあります",
        details: err.issues,
      },
      400
    );
  }

  // 3. それ以外の予期せぬエラー (バグ、DB接続断など)
  console.error("Unhandled Error:", err); // ログに残す
  return c.json(
    {
      error: "InternalServerError",
      message: "予期せぬエラーが発生しました",
    },
    500
  );
});

// --- 依存性注入 (DI) ミドルウェア ---
app.use('*', async (c, next) => {
  const env = c.env;
  // Drizzleインスタンスを作成し、DB接続とスキーマをHono Contextに設定
  const db = drizzle(env.DB, { schema });
  c.set('db', db as DbInstance);

  // Better AuthインスタンスをHono Contextに設定
  const auth = createBetterAuth(db, env);
  c.set('auth', auth);

  await next();
});

// 1. CORSミドルウェアの設定 (Authの前に配置)
app.use('/api/*', cors({
  origin: (origin) => {
    // 許可するフロントエンドのドメインを指定
    // 開発環境と本番環境(Vercel)の両方を許可
    return origin.endsWith('.vercel.app') || origin.includes('localhost') 
      ? origin 
      : 'https://fumufumu-phi.vercel.app'; // フォールバック
  },
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Set-Cookie'],
  maxAge: 600,
  credentials: true, // Cookieをやり取りするために必須
}));

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    const db = drizzle(env.DB);

    // 接続テスト
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

// --- APIルーター（/api配下） ---
const api = new Hono<AppBindings>();

// カスタム認証エンドポイント（/api/auth/signup, /api/auth/signinなど）
api.route('/auth', authRouter);

// 認証テスト用エンドポイント（/api/protected）
api.route('/protected', protectedRouter);

// 相談API（/api/consultations）
api.route('/consultations', consultationsRoute);

// メインアプリにAPIルーターをマウント
app.route('/api', api);

export default app
