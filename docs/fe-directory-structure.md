## **📁 Fumufumu Frontend アプリケーション構造 (Next.js App Router)**

※Feature-Drivenといいつつ、なるべくファイルベースルーティングのところからコードを分離して、Feature別（相談、回答、タグ、通知 etc）にコンポーネントやロジック群を書けたらいいなぁと思っているぐらいです。一旦厳密に守る必要はありません（レビュー時にこれはこっちに切り出したほうがいいかもとは提案するかもです）
※重かったりしたら随時辞めます

このドキュメントは、@fumufumu/frontend アプリケーションの最終的なディレクトリ構造（アーキテクチャ）を示します。これは現在の最小構成ではなく、機能追加を通じて目指すべき整理された構成の青写真です。

アーキテクチャは、**機能駆動 (Feature-Driven)** と **レイヤー分離** を組み合わせた構造を採用し、中規模化しても保守性と拡張性が維持されることを目指します。

### **1\. Root レベル (apps/fumufumu-frontend/)**

| ディレクトリ/ファイル | 目的 |
| :---- | :---- |
| next.config.ts | Next.js の設定ファイル。**rewrites** 機能など、ビルド・ルーティング設定を記述。 |
| package.json | プロジェクトの依存関係とスクリプトを管理。 |
| postcss.config.mjs | Tailwind CSS の設定。 |
| tsconfig.json | TypeScript コンパイラ設定 (@/\* のエイリアス定義を含む)。 |

### **2\. メインソース (src/)**

src ディレクトリ配下に、アプリケーションの全てのロジックを配置します。

#### **A. ルーティングとビュー (src/app/)**

Next.js App Router の規約に沿ったルーティング定義を行います。

| パス | 目的 |
| :---- | :---- |
| src/app/(public)/ | **ランディングページ**や利用規約など、認証不要の公開ページ。 |
| src/app/(auth)/ | **ログイン、サインアップ**など、認証フロー専用のページとレイアウト。 |
| src/app/(main)/ | **ダッシュボード、エディタ**など、認証後にアクセスする主要なアプリ画面。 |
| src/app/api/ | CORS対策やセキュリティ、外部連携のための **API Route Handler (サーバーレス機能)**。 |
| src/app/globals.css | グローバルスタイル定義（主に Tailwind の @import）。 |

#### **B. 共有レイヤー (Utilities & Types)**

アプリケーション全体で利用するロジックや型定義を分離します。

| パス | 目的 |
| :---- | :---- |
| src/lib/ | **汎用ユーティリティ関数** (utils.ts) や、サードパーティサービスのクライアント初期化（Auth ライブラリ、APIクライアントなど）を配置。 |
| src/types/ | **グローバルな TypeScript 型定義**（例: FumufumuApi インターフェース、APIレスポンス型）。 |
| src/hooks/ | **再利用可能なカスタムフック**。状態管理や外部データフェッチロジック（例: useBackendStatus.ts）を分離。 |

#### **C. コンポーネントとフィーチャー (UI & Business Logic)**

Reactコンポーネントをその役割に応じて分類します。

| パス | 目的 |
| :---- | :---- |
| src/components/ui/ | **基盤となるUIプリミティブ**。アプリケーションの見た目を構成する最小単位（例: Button.tsx, Input.tsx, Card.tsx）。 |
| src/components/common/ | **アプリケーション共通のコンポーネント**。レイアウトを構成するもの（例: Header.tsx, Sidebar.tsx）。 |
| src/features/ | **特定のビジネスロジックとUIを結合した機能単位**（フィーチャー）。 |
| src/features/consultation/ | features の例: 相談作成・編集機能に関連する全てのコンポーネントとロジック。 |
| src/features/user-auth/ | 認証フローに関する具体的なロジックやコンポーネント（例: フォームの状態管理）。 |

### **3\. 目指す構造のサマリー**

src/  
├── app/  
│   ├── (auth)/  
│   ├── (main)/  
│   ├── (public)/  
│   ├── api/  
│   └── ...  
├── components/  
│   ├── ui/  
│   └── common/  
├── features/  
│   ├── consultation-editor/  
│   └── ...  
├── hooks/  
│   └── useBackendStatus.ts  
├── lib/  
└── types/  
    └── consultation.ts (API スキーマ定義。BEと共通化できれば将来的に追加するかも)  
