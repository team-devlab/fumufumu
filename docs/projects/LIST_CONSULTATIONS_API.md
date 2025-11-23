# 相談リスト取得API実装

## 概要

相談（Consultations）のリスト取得APIを実装します。

### 対象エンドポイント

```
GET /api/consultations
```

### 主な機能

- 相談の一覧を取得
- クエリパラメータによる絞り込み（userId, draft, solved）
- 認証は今後実装予定（TODO）

---

## アーキテクチャ設計

### 採用アーキテクチャ

**3層アーキテクチャ（3-Tier Architecture）**

- **Presentation層（Routes）**: HTTPリクエスト/レスポンスの処理
- **Business層（Services）**: ビジネスロジックの実装
- **Data層（Repositories）**: データアクセス処理

### 選定理由

1. **シンプルで理解しやすい** - チーム全員が素早くキャッチアップ可能
2. **段階的移行が可能** - 将来的に必要になればレイヤードアーキテクチャへ移行可能

---

## ディレクトリ構造

```
apps/fumufumu-backend/
├── src/
│   ├── index.ts                          # エントリーポイント
│   │
│   ├── routes/                           # Presentation層
│   │   ├── consultations.ts              # /api/consultations 相談関連ルート（新規）
│   │   └── health.ts                     # ヘルスチェック（移動）
│   │
│   ├── services/                         # Business層（新規ディレクトリ）
│   │   └── consultation.service.ts       # 相談ビジネスロジック
│   │
│   ├── repositories/                     # Data層（新規ディレクトリ）
│   │   └── consultation.repository.ts    # 相談データアクセス
│   │
│   ├── db/
│   │   ├── index.ts                      # DB接続
│   │   └── schema/
│   │       ├── consultations.ts          # 相談スキーマ（新規）
│   │       ├── tags.ts                   # タグスキーマ（新規）
│   │       ├── user.ts                   # ユーザースキーマ（既存）
│   │       └── auth.ts                   # 認証スキーマ（既存）
│   │
│   ├── types/                            # 型定義（新規ディレクトリ）
│   │   └── consultation.types.ts         # 相談関連の型定義
│   │
│   └── utils/                            # ユーティリティ（新規ディレクトリ）
│       ├── validation.ts                 # バリデーション
│       └── error-handler.ts              # エラーハンドリング
│
└── drizzle/                              # マイグレーションファイル
```

---

## 実装の流れ

### フェーズ1: DBスキーマの定義 ✅

- [x] `consultations.ts` スキーマ定義
- [x] マイグレーションファイルの生成（`pnpm generate`）
- [x] ローカルDBへの適用（`pnpm local:migration`）
- [x] Drizzle Studioで確認
- [x] シードデータの投入

### フェーズ2: プロジェクト構造の整備 ✅

- [x] `routes/`, `services/`, `repositories/` ディレクトリ作成
- [x] `types/`ディレクトリ作成


### フェーズ3: 型定義とユーティリティ ⏳

- [x] `consultation.types.ts` の作成（DTOやEntity型）
- [ ] `validation.ts` の作成（クエリパラメータ検証）
- [ ] `error-handler.ts` の作成（統一エラーレスポンス）

### フェーズ4: 実装（TDD方式） ⏳

#### 4-1. Repository層

- [ ] `ConsultationRepository` クラスの実装
  - [ ] `findAll()` メソッド（フィルタリング対応）
  - [ ] クエリビルダーの実装


#### 4-2. Service層

- [ ] `consultation.service.ts` の単体テスト作成
- [ ] `ConsultationService` クラスの実装
  - [ ] `listConsultations()` メソッド
  - [ ] レスポンス整形ロジック
  - [ ] `body_preview` の生成（先頭N文字）

#### 4-3. Route層（Controller）

- [ ] `consultations.ts` の単体テスト作成
※テストは、API単体テストのみ実装
- [ ] GET `/api/consultations` エンドポイントの実装
  - [ ] クエリパラメータの取得
  - [ ] バリデーション
  - [ ] ServiceとRepositoryのDI
  - [ ] エラーハンドリング

### フェーズ5: 動作確認 ⏳

- [ ] ローカルサーバー起動（`pnpm dev`）
- [ ] テストデータの投入
- [ ] curlでAPIテスト **← 今回の実装ゴール**
  - [ ] `/api/consultations` - 全件取得
  - [ ] `/api/consultations?userId=1` - ユーザー絞り込み
  - [ ] `/api/consultations?draft=false` - 公開済みのみ
  - [ ] `/api/consultations?solved=true` - 解決済みのみ

---
---

## 参考資料

- API設計書: `docs/design/api/api-list-consultations.md`
- スキーマ定義: `docs/design/api/schemas.md`
- データベース基盤: `docs/projects/1-SETUP_DATABASE_AND_AUTH.md`

---

## 次のステップ

このドキュメントのレビュー承認後、フェーズ1（DBスキーマの定義）から実装を開始します。

