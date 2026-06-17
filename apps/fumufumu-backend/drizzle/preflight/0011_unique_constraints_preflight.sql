-- Preflight check for migration 0011 (0011_auth_unique_constraints.sql)
--
-- 0011 は以下の 3 つの UNIQUE INDEX を追加する:
--   - auth_accounts (provider_id, account_id)
--   - auth_accounts (user_id, provider_id)
--   - auth_mappings  (auth_user_id)
--
-- 既存データに重複があると CREATE UNIQUE INDEX が失敗してマイグレーションが
-- 中断するため、本番/各環境への適用「前」にこの SQL を流し、すべて 0 行で
-- あることを確認する。1 行でも返った場合は重複を解消してから 0011 を適用すること。
--
-- 実行例:
--   wrangler d1 execute DB --remote \
--     --config "$WRANGLER_D1_CONFIG" \
--     --file drizzle/preflight/0011_unique_constraints_preflight.sql

-- 1. auth_accounts (provider_id, account_id) の重複
SELECT 'auth_accounts(provider_id, account_id)' AS constraint_name,
       provider_id,
       account_id,
       COUNT(*) AS duplicate_count
FROM auth_accounts
GROUP BY provider_id, account_id
HAVING COUNT(*) > 1;

-- 2. auth_accounts (user_id, provider_id) の重複
SELECT 'auth_accounts(user_id, provider_id)' AS constraint_name,
       user_id,
       provider_id,
       COUNT(*) AS duplicate_count
FROM auth_accounts
GROUP BY user_id, provider_id
HAVING COUNT(*) > 1;

-- 3. auth_mappings (auth_user_id) の重複
SELECT 'auth_mappings(auth_user_id)' AS constraint_name,
       auth_user_id,
       COUNT(*) AS duplicate_count
FROM auth_mappings
GROUP BY auth_user_id
HAVING COUNT(*) > 1;
