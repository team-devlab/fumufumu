# ページネーション機能 手動テスト手順

**作成日**: 2026-02-07  
**対象**: 相談一覧API ページネーション機能

---

## 🚀 事前準備

```bash
# バックエンド起動
cd apps/fumufumu-backend
pnpm dev

# 別ターミナルでログインしてセッションCookieを取得
cd apps/fumufumu-backend
cat cookie_jar.txt
# または、フロントエンドからログインして開発者ツールでCookieを取得
```

---

## 📝 テストケース

### ✅ Test 1: デフォルト値（page=1, limit=20）

```bash
curl -X GET "http://127.0.0.1:8787/api/consultations" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.pagination'
```

**期待結果:**
```json
{
  "current_page": 1,
  "per_page": 20,
  "total_items": <実際の件数>,
  "total_pages": <計算値>,
  "has_next": <true/false>,
  "has_prev": false
}
```

---

### ✅ Test 2: page=2 を指定

```bash
curl -X GET "http://127.0.0.1:8787/api/consultations?page=2" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.pagination'
```

**期待結果:**
```json
{
  "current_page": 2,
  "per_page": 20,
  "has_prev": true,
  ...
}
```

---

### ✅ Test 3: limit=10 を指定

```bash
curl -X GET "http://127.0.0.1:8787/api/consultations?limit=10" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.pagination'
```

**期待結果:**
```json
{
  "current_page": 1,
  "per_page": 10,
  ...
}
```

**データ件数確認:**
```bash
curl -X GET "http://127.0.0.1:8787/api/consultations?limit=10" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.data | length'
```
→ 10以下の数値が返る

---

### ✅ Test 4: page と limit の組み合わせ

```bash
curl -X GET "http://127.0.0.1:8787/api/consultations?page=2&limit=5" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.pagination'
```

**期待結果:**
```json
{
  "current_page": 2,
  "per_page": 5,
  ...
}
```

---

### ✅ Test 5: 不正な値（バリデーションエラー）

```bash
# page=0（1未満）
curl -X GET "http://127.0.0.1:8787/api/consultations?page=0" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
# → 400 Bad Request

# limit=101（100超過）
curl -X GET "http://127.0.0.1:8787/api/consultations?limit=101" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
# → 400 Bad Request
```

---

### ✅ Test 6: 存在しないページ

```bash
curl -X GET "http://127.0.0.1:8787/api/consultations?page=999" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '{data_length: (.data | length), pagination}'
```

**期待結果:**
- `data`: 空配列
- `pagination.has_next`: false

---

### ✅ Test 7: フィルタとの組み合わせ

```bash
# draft=false + ページネーション
curl -X GET "http://127.0.0.1:8787/api/consultations?draft=false&page=1&limit=10" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  | jq '.pagination'
```

---

## 📊 確認項目チェックリスト

- [ ] pagination オブジェクトが返却される
- [ ] current_page が正しい
- [ ] per_page が正しい
- [ ] total_items が正しい（実際のDB件数と一致）
- [ ] total_pages が正しい（Math.ceil(total_items / per_page)）
- [ ] has_next が正しい
- [ ] has_prev が正しい
- [ ] data配列の件数が per_page 以下
- [ ] page=0 でバリデーションエラー
- [ ] limit=101 でバリデーションエラー
- [ ] 存在しないページで空配列が返る

---

## 🐛 トラブルシューティング

### Cookieが取得できない

```bash
# フロントエンドでログイン後、開発者ツールで確認
# Application > Cookies > localhost:3000
# better-auth.session_token の値をコピー
```

### jq がない

```bash
# macOS
brew install jq

# または、jq なしで確認
curl -X GET "http://127.0.0.1:8787/api/consultations" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

---

## ✅ 実行結果記録

**実施日**: ____年__月__日  
**実施者**: ____________

| テスト | 結果 | メモ |
|--------|------|------|
| Test 1: デフォルト | ⬜ | |
| Test 2: page=2 | ⬜ | |
| Test 3: limit=10 | ⬜ | |
| Test 4: 組み合わせ | ⬜ | |
| Test 5: バリデーション | ⬜ | |
| Test 6: 存在しないページ | ⬜ | |
| Test 7: フィルタ併用 | ⬜ | |
