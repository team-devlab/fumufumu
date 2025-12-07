## docs ディレクトリ概要

### ディレクトリ構成

- **design/**: 各種設計資料（API設計書、ER図など）
- **guidelines/**: 開発ガイドライン・ベストプラクティス
- **verification/**: APIテスト結果と動作確認記録

---

## 🧔 設計原則（Kent Beck's Advice）

### コントローラー層の設計

> *「Controller層はHTTPの薄いラッパーであるべき。ビジネスロジックのテストはService層で行う。」*

#### 推奨パターン

```typescript
// ✅ シンプルなインラインハンドラ（Hono公式推奨）
consultationsRoute.get(
  "/",
  zValidator("query", schema),
  async (c) => {
    const query = c.req.valid("query"); // 型推論が自動で効く
    // ...
  }
);
```

#### テスト戦略

| レイヤー | テスト方法 | 優先度 |
|---------|----------|-------|
| API全体 | APIテスト（E2E） | **高** |
| Service | ユニットテスト（必要に応じて） | 低 |
| Controller | ユニットテスト | 低（基本不要） |
| Repository | ユニットテスト | 低（基本不要） |

詳細は [hono-handler-design-decision.md](./guidelines/hono-handler-design-decision.md) を参照。

---

### テスト方針

このプロジェクトでは **APIテスト（E2Eテスト）を基本** とし、ユニットテストは必要に応じて追加します。

- ✅ **APIテスト**: 実際のHTTPリクエスト/レスポンス、DB操作を含む統合テスト（**メイン**）
- ⚠️ **Service層テスト**: 複雑なビジネスロジックがある場合のみ追加
- ❌ **Controller/Repository層テスト**: 基本的に不要（APIテストでカバー）


#### テスト実行方法

```bash
# 開発サーバー起動
pnpm run dev

# curlでAPIテスト
curl -X GET "http://127.0.0.1:8787/api/consultations" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

詳細は各verificationドキュメントを参照してください。
