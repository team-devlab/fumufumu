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
| Controller | 統合テスト（`app.request()`） | 中 |
| Service | ユニットテスト | **高** |
| Repository | ユニットテスト | 中 |

詳細は [hono-handler-design-decision.md](./guidelines/hono-handler-design-decision.md) を参照。

---

### テスト方針

このプロジェクトでは **実際のAPIテスト（E2Eテスト）** を主要なテスト手法として採用しています。

- ✅ **APIテスト**: 実際のHTTPリクエスト/レスポンス、DB操作を含む統合テスト（メイン）
- ⚠️ **単体テスト**: 初期実装時のみ作成、今後は追加しない（参考資料として保持）

#### APIテストの記録場所

- `verification/` ディレクトリ配下に、各APIの動作確認結果を記録
- 例: `verification/consultations-list-api-verification.md`

#### テスト実行方法

```bash
# 開発サーバー起動
pnpm run dev

# curlでAPIテスト
curl -X GET "http://127.0.0.1:8787/api/consultations" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

詳細は各verificationドキュメントを参照してください。
