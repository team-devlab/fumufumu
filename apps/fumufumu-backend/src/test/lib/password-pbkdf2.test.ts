import { describe, it, expect } from "vitest";
import {
  hashPasswordPbkdf2,
  verifyPasswordPbkdf2,
} from "../../lib/password-pbkdf2";

describe("password-pbkdf2", () => {
  it("hash と verify が round-trip する", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPasswordPbkdf2(password);
    expect(hash.startsWith("pbkdf2$")).toBe(true);

    const ok = await verifyPasswordPbkdf2({ password, hash });
    expect(ok).toBe(true);
  });

  it("同じ password でも salt が異なるため hash 文字列は毎回変わる", async () => {
    const password = "same-input-different-output";
    const hashA = await hashPasswordPbkdf2(password);
    const hashB = await hashPasswordPbkdf2(password);

    // 文字列としては別だが、verify はどちらも通る
    expect(hashA).not.toBe(hashB);
    expect(await verifyPasswordPbkdf2({ password, hash: hashA })).toBe(true);
    expect(await verifyPasswordPbkdf2({ password, hash: hashB })).toBe(true);
  });

  it("間違った password の verify は false を返す", async () => {
    const hash = await hashPasswordPbkdf2("the-real-password");
    const ok = await verifyPasswordPbkdf2({
      password: "wrong-guess",
      hash,
    });
    expect(ok).toBe(false);
  });

  it("hash format が壊れている場合は false を返す（例外を投げない）", async () => {
    const password = "any";
    expect(await verifyPasswordPbkdf2({ password, hash: "" })).toBe(false);
    expect(await verifyPasswordPbkdf2({ password, hash: "not-a-hash" })).toBe(
      false,
    );
    expect(
      await verifyPasswordPbkdf2({
        password,
        hash: "pbkdf2$abc$###bad-b64###$###bad-b64###",
      }),
    ).toBe(false);
    expect(
      await verifyPasswordPbkdf2({
        password,
        hash: "scrypt$1$salt$hash",
      }),
    ).toBe(false);
  });

  it("hash 文字列に iterations が埋め込まれている（将来引き上げ時の互換維持用）", async () => {
    const hash = await hashPasswordPbkdf2("anything");
    const parts = hash.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("pbkdf2");
    expect(Number.parseInt(parts[1], 10)).toBeGreaterThan(0);
  });
});
