## docs ディレクトリ概要

### ディレクトリ構成

- **design/**: 各種設計資料（API設計書、ER図など）
- **verification/**: APIテスト結果と動作確認記録

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
