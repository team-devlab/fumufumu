import { env, applyD1Migrations } from 'cloudflare:test';

// Extend the env type to include DB for testing
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: any;
  }
}

interface D1Migration {
  name: string;
  queries: string[];
}

/**
 * Drizzleのマイグレーションファイルを読み込み、テストDBに適用する
 */
export async function setupIntegrationTest() {
  const migrations = getMigrations();
  try {
    // cloudflare:test の env.DB に対してマイグレーションを実行
    // @ts-ignore
        await applyD1Migrations(env.DB, migrations);
  } catch (e) {
    console.error('Failed to apply migrations:', e);
    throw e;
  }
}

/**
 * drizzleディレクトリからSQLファイルを同期的に取得する内部関数
 * Viteの import.meta.glob を使用
 */
function getMigrations(): D1Migration[] {
  // 1. マイグレーションの実行順序を管理するジャーナルファイルを読み込む
  // パスは test/helpers/ から見た相対パス（../../../drizzle/）
  const journalGlobs = import.meta.glob('../../../drizzle/meta/_journal.json', { eager: true });
  const journalPath = Object.keys(journalGlobs)[0];
  const journal = journalGlobs[journalPath] as { entries: { tag: string }[] };

  if (!journal) {
    throw new Error('Migration journal not found. Check if "drizzle" directory exists at root.');
  }

  // 2. すべての .sql ファイルをテキストとして読み込む
  const sqlGlobs = import.meta.glob('../../../drizzle/*.sql', {
    eager: true,
    query: '?raw',
    import: 'default'
  });

  // 3. ジャーナルの順序に従ってSQLクエリを配列化
  return journal.entries.map((entry) => {
    const sqlKey = `../../../drizzle/${entry.tag}.sql`;
    const sqlContent = sqlGlobs[sqlKey] as string;

    if (!sqlContent) {
      throw new Error(`Migration file not found for: ${entry.tag}`);
    }

    // Drizzleのセパレーター "--> statement-breakpoint" で分割
    const queries = sqlContent
      .split('--> statement-breakpoint')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    return {
      name: entry.tag,
      queries: queries,
    };
  });
}

/**
 * 特定の相談レコードを「解決済み」状態に更新する
 */
export async function forceSetSolved(id: number) {
  await env.DB.prepare(
    "UPDATE consultations SET solved_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?"
  ).bind(id).run();
}

/**
 * 特定の相談レコードを「非表示」状態に更新する
 */
export async function forceSetHidden(id: number) {
  await env.DB.prepare(
    "UPDATE consultations SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?"
  ).bind(id).run();
}
