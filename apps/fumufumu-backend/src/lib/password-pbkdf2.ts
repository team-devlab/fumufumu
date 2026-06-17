/**
 * Web Crypto API ベースの PBKDF2 password hash / verify 実装。
 *
 * Cloudflare Workers Free プランの 10ms CPU 制限内に収まるよう、iterations を抑えている。
 * Better Auth のデフォルト (scrypt 系) は Workers Free では CPU 制限超過で 503 になるため、
 * その代替として `emailAndPassword.password.hash / verify` に差し込んで使う。
 *
 * 形式: `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`
 *   - 先頭の `pbkdf2` は version / algorithm tag
 *   - iterations は decode 時に hash 文字列から復元できる（後で値を上げても旧 hash を verify 可能）
 *
 * セキュリティ上の妥協:
 *   - OWASP 2023 の PBKDF2-HMAC-SHA256 推奨は 600,000 iterations。
 *   - 本実装は Workers Free の CPU 制約に合わせるため、初期値を 50,000 に設定する。
 *   - 将来 Workers Standard plan に upgrade した場合、または別の解決策が取れた場合は
 *     iterations を引き上げる（既存 hash は format から iterations を読めるため互換維持できる）。
 *   - 詳細は ADR 008 / Issue #123 / 実装計画 07 の Phase 1.5 を参照。
 */

const ALGORITHM_TAG = "pbkdf2";
const HASH_FUNCTION: AlgorithmIdentifier = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * 初期 iterations 数。
 *
 * 値の決め方:
 *   - Workers Free の 10ms CPU 制限に収まる範囲で大きい値を選ぶ
 *   - 実測してから必要に応じて調整する（`wrangler tail` で CPU 時間を観測）
 *   - hash 文字列に iterations を埋め込んでいるため、後から引き上げても旧 hash の verify は壊れない
 */
const DEFAULT_ITERATIONS = 50_000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveBits(
  password: string,
  salt: ArrayBuffer,
  iterations: number,
): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey(
    "raw",
    encoded,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: HASH_FUNCTION,
    },
    key,
    KEY_BYTES * 8,
  );
}

/**
 * 定数時間比較。
 * 早期 return すると timing attack で hash の中身が漏れうるため、長さチェック以外で短絡しない。
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Password を PBKDF2-HMAC-SHA256 で hash する。
 * Better Auth の `emailAndPassword.password.hash` に渡す想定。
 */
export async function hashPasswordPbkdf2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveBits(password, salt.buffer, DEFAULT_ITERATIONS);
  return [
    ALGORITHM_TAG,
    DEFAULT_ITERATIONS.toString(),
    bufferToBase64(salt),
    bufferToBase64(derived),
  ].join("$");
}

/**
 * 保存済み hash と照合する。
 * Better Auth の `emailAndPassword.password.verify` に渡す想定。
 */
export async function verifyPasswordPbkdf2(args: {
  password: string;
  hash: string;
}): Promise<boolean> {
  const { password, hash } = args;
  const parts = hash.split("$");
  if (parts.length !== 4) return false;
  const [tag, iterStr, saltB64, expectedB64] = parts;
  if (tag !== ALGORITHM_TAG) return false;

  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  let saltBuf: ArrayBuffer;
  let expectedBuf: ArrayBuffer;
  try {
    saltBuf = base64ToBuffer(saltB64);
    expectedBuf = base64ToBuffer(expectedB64);
  } catch {
    return false;
  }

  const derived = await deriveBits(password, saltBuf, iterations);
  return constantTimeEqual(new Uint8Array(derived), new Uint8Array(expectedBuf));
}
