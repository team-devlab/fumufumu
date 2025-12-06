# Honoハンドラの書き方比較：インライン vs createHandlers

## 📌 概要

Honoでルートハンドラを書く方法は主に2つあります。それぞれのメリット・デメリットを比較します。

---

## 1️⃣ インラインハンドラ（推奨パターン）

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get(
  "/consultations",
  zValidator("query", listConsultationsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");  // 型推論が効く
    const db = c.get("db");              // 型推論が効く
    return c.json({ data: [] });
  }
);
```

### ✅ メリット

| 項目 | 説明 |
|------|------|
| **シンプル** | 追加のimportやセットアップ不要 |
| **型推論が完全** | ミドルウェアの型情報が自動的に引き継がれる |
| **公式推奨** | Honoドキュメントで推奨されている書き方 |
| **コードの凝集性** | ルート定義とハンドラが近くにある |
| **学習コスト低** | Honoの基本的な使い方のみで完結 |

### ❌ デメリット

| 項目 | 説明 |
|------|------|
| **テストしづらい** | ハンドラ関数を単体で呼び出せない |
| **再利用できない** | 同じハンドラを複数ルートで使えない |
| **ファイルが肥大化** | ルートが増えると1ファイルが長くなる |

---

## 2️⃣ createHandlers パターン

```typescript
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";

const factory = createFactory<{ Bindings: Env; Variables: Variables }>();

// ハンドラを別途定義（再利用可能）
const listConsultationsHandlers = factory.createHandlers(
  zValidator("query", listConsultationsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");  // 型推論が効く
    const db = c.get("db");              // 型推論が効く
    return c.json({ data: [] });
  }
);

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.get("/consultations", ...listConsultationsHandlers);
```

### ✅ メリット

| 項目 | 説明 |
|------|------|
| **ハンドラの再利用** | 同じハンドラを複数ルートで使える |
| **ファイル分割しやすい** | ハンドラを別ファイルに切り出せる |
| **型安全** | `createFactory`で型情報を一元管理 |
| **テストしやすい** | ハンドラ配列を単体でテスト可能 |
| **ミドルウェアの共有** | 複数ルートで同じミドルウェアセットを使える |

### ❌ デメリット

| 項目 | 説明 |
|------|------|
| **セットアップが必要** | `createFactory`のインポートと初期化が必要 |
| **学習コスト** | `createFactory`の使い方を理解する必要がある |
| **コードが分散** | ルート定義とハンドラが離れる可能性 |
| **オーバーヘッド** | 小規模プロジェクトでは過剰 |

---

## 📊 比較表

| 観点 | インライン | createHandlers |
|------|-----------|----------------|
| **シンプルさ** | ⭐⭐⭐ | ⭐⭐ |
| **型安全性** | ⭐⭐⭐ | ⭐⭐⭐ |
| **テスト容易性** | ⭐ | ⭐⭐⭐ |
| **再利用性** | ⭐ | ⭐⭐⭐ |
| **ファイル分割** | ⭐⭐ | ⭐⭐⭐ |
| **学習コスト** | ⭐⭐⭐（低い） | ⭐⭐（中程度） |
| **小規模プロジェクト** | ⭐⭐⭐ | ⭐⭐ |
| **大規模プロジェクト** | ⭐⭐ | ⭐⭐⭐ |

---

## 🎯 使い分けの指針

### インラインハンドラを選ぶべき場合

- ✅ 小〜中規模プロジェクト
- ✅ ルート数が少ない（〜20程度）
- ✅ ハンドラの再利用が不要
- ✅ シンプルさを重視
- ✅ APIテスト（E2E）で検証する方針

### createHandlersを選ぶべき場合

- ✅ 大規模プロジェクト
- ✅ ルート数が多い（20+）
- ✅ 同じハンドラを複数ルートで使う
- ✅ ハンドラの単体テストが必要
- ✅ チーム開発でファイル分割が重要

---

## 💡 ハイブリッドアプローチ

実際のプロジェクトでは、両方を組み合わせることも可能です：

```typescript
// 共通のファクトリを定義
const factory = createFactory<{ Bindings: Env; Variables: Variables }>();

// 単純なルートはインライン
app.get("/health", (c) => c.json({ status: "ok" }));

// 複雑なルートはcreateHandlers
const complexHandlers = factory.createHandlers(
  authGuard,
  zValidator("query", schema),
  async (c) => { /* ... */ }
);
app.get("/complex", ...complexHandlers);
```

---

## 🏆 結論

### 今回のプロジェクト（fumufumu）での推奨

**インラインハンドラを推奨**

理由：
1. 現時点でルート数が少ない
2. APIテスト（E2E）を主要なテスト手法としている
3. シンプルさを重視
4. `as any`を避けられる

将来的にルート数が増えたら、`createHandlers`パターンへの移行を検討。

---

## 📚 参考リンク

- [Hono - Best Practices](https://hono.dev/docs/guides/best-practices)
- [Hono - createFactory](https://hono.dev/docs/helpers/factory)
- [Hono - RPC / Type Safety](https://hono.dev/docs/guides/rpc)

---

**作成日**: 2025-12-02  
**更新日**: 2025-12-02

