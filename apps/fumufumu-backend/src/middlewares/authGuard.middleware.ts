import { Next, Context } from 'hono';
import { eq } from 'drizzle-orm';

import { type Env, type Variables } from '../index';
import { authMappings, users } from '../db/schema/user';
import { accountDisabledBody } from '../lib/account-status';

type AppContext = Context<{ Bindings: Env, Variables: Variables }>;

/**
 * 認証ガードの生成オプション。
 */
type AuthGuardOptions = {
  /**
   * disabled(BAN) 中のユーザーを 403 で弾かずに通すかどうか。
   *
   * 既定(false)は従来どおり disabled を 403 で enforce する (#136)。
   * true は退会エンドポイント専用。退会は消去権の行使であり BAN 中でも行えねばならないため、
   * disabled の 403 ゲートだけを外す(セッション認証そのものは必須のまま)。詳細は ADR 013 §5.5。
   */
  allowDisabled: boolean;
};

/**
 * 認証ミドルウェアのファクトリ: 認証・無効化チェック・ID/role 注入
 * 責務: 1. セッション検証 2. disabled(BAN) の enforce 3. appUserId と userRole を Context に注入
 *
 * disabled の扱いだけを allowDisabled で切り替える。セッション検証・マッピング取得・401 分岐は
 * 常に共通で、通常ガードと退会ガードで二重管理にならないよう 1 実装に集約する。
 *
 * @param options allowDisabled で disabled(BAN) を通すかを指定
 */
export const createAuthGuard = (options: AuthGuardOptions) => async (c: AppContext, next: Next) => {
  const auth = c.get('auth');
  const db = c.get('db');

  // セッションの検証
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // セッションが存在しないか、ユーザー情報がない場合は認証失敗
  const authUserId = session?.user?.id;
  if (!authUserId) {
    return c.json({
      error: 'Unauthorized',
      message: 'Session invalid or missing.'
    }, 401);
  }

  // authMappings と users を 1 往復(innerJoin)で引き、appUserId・disabled・role をまとめて取得する。
  // - disabled を毎リクエスト DB から読むため、BAN は次リクエストで即時に効く
  //   (Better Auth の cookieCache はこの独自クエリに影響しない)。
  // - role も同時に取り、後段の adminGuard が再クエリせず c.get('userRole') を使えるようにする (#136)。
  const rows = await db
    .select({
      appUserId: authMappings.appUserId,
      disabled: users.disabled,
      role: users.role,
    })
    .from(authMappings)
    .innerJoin(users, eq(users.id, authMappings.appUserId))
    .where(eq(authMappings.authUserId, authUserId))
    .limit(1);

  const account = rows[0];

  // マッピング欠落・users 行欠落はいずれも認証失敗として扱う(innerJoin なので両者を同時に担保)。
  if (!account) {
    return c.json({
      error: 'Unauthorized',
      message: 'App User ID mapping missing.'
    }, 401);
  }

  // disabled は権限不足(admin API の 404 化)とは別概念。
  // 本人に「無効化されている」ことを明確に伝えるため 403 + 明示メッセージにする (#136)。
  // ただし allowDisabled(退会) のときはこの 403 ゲートを通す(BAN 中でも消去権を行使できる, ADR 013 §5.5)。
  if (!options.allowDisabled && account.disabled) {
    // BAN が本番で効いているかの確認・保持 Cookie での連続アクセス検知のため、
    // adminGuard の拒否ログと同じ粒度でアクセス試行を記録する。
    console.warn('authGuard: disabled account blocked', {
      appUserId: account.appUserId,
      method: c.req.method,
      path: c.req.path,
    });
    return c.json(accountDisabledBody, 403);
  }

  // appUserId(業務ID) と role をコンテキストに格納
  c.set('appUserId', account.appUserId);
  c.set('userRole', account.role);

  await next();
};

/**
 * 標準の認証ガード。disabled(BAN) を 403 で弾く従来挙動 (#136)。
 * 認証必須 API はこれを使う。
 */
export const authGuard = createAuthGuard({ allowDisabled: false });

/**
 * 退会専用の認証ガード。disabled(BAN) 中でも通す（消去権は BAN 中でも行使できる。ADR 013 §5.5）。
 * セッション認証は必須。退会エンドポイント以外では使わない。
 */
export const withdrawalAuthGuard = createAuthGuard({ allowDisabled: true });
