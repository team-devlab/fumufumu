### **API動作確認手順と curl コマンド (全体動作確認用)**

この手順では、新規ユーザーのサインアップから保護ルートへのアクセスまで、一連の認証フローの動作を確認します。

**【重要】** 以前のテストで testuser@example.com は登録済みのため、ここでは **newuser@example.com** を使用します。

#### **1. サインアップ (/api/signup) - 新規ユーザーの作成**

新しいユーザーを作成し、セッションクッキーを cookie_jar.txt に保存します。この成功レスポンスには、クッキー情報が含まれている必要があります。

**コマンド:**

```
curl -v -X POST 'http://localhost:8787/api/auth/signup' \
     -H 'Content-Type: application/json' \
     -d '{"email": "newuser1@example.com", "password": "password123", "name": "New Test User"}' \
     --cookie-jar cookie_jar.txt
```

**期待される結果:**

* **HTTPステータス:** 200 OK  
* **ヘッダー:** Set-Cookie: ヘッダーが含まれていること。  
* **レスポンスボディ:** message が "User created and signed in successfully." となっており、新しい app_user_id (例: 3) が含まれていること。

#### **2. 保護ルートへのアクセス（サインアップ直後のセッション利用）**

ステップ1で保存したセッションクッキー (cookie_jar.txt) を使用して、保護ルートにアクセスします。

**コマンド:**

curl -v 'http://localhost:8787/api/protected' \
     --cookie cookie_jar.txt

**期待される結果:**

* **HTTPステータス:** 200 OK  
* **リクエストヘッダー:** Cookie: ヘッダーが送信されていること。  
* **レスポンスボディ:** 成功メッセージと appUserId、userName が含まれていること。

#### **3. サインアウト (セッションクッキーの削除)**

サインアウトAPIが存在しないため、ここではセッションを破棄せず、次に進みます。

#### **4. サインイン (/api/signin) - セッションの更新**

ステップ1で作成したユーザーでサインインし、セッションクッキーを更新します。

**コマンド:**

curl -v -X POST 'http://localhost:8787/api/auth/signin' \
     -H 'Content-Type: application/json' \
     -d '{"email": "newuser1example.com", "password": "password123"}' \
     --cookie-jar cookie_jar.txt

**期待される結果:**

* **HTTPステータス:** 200 OK  
* **ヘッダー:** 新しい Set-Cookie: ヘッダーが含まれていること。  
* **レスポンスボディ:** message が "Sign in successful." となっていること。

#### **5. 保護ルートへのアクセス（サインイン後の新しいセッション利用）**

更新されたセッションクッキー (cookie_jar.txt) を使用して、保護ルートにアクセスします。

**コマンド:**

curl -v 'http://localhost:8787/api/protected' \
     --cookie cookie_jar.txt

**期待される結果:**

* **HTTPステータス:** 200 OK  
* **リクエストヘッダー:** Cookie: ヘッダーが送信されていること。  
* **レスポンスボディ:** 成功メッセージと appUserId、userName が含まれていること。

### example:

curl -v -X POST 'http://localhost:8787/api/consultations' \
     -H 'Content-Type: application/json' \
     --cookie cookie_jar.txt \
     -d '{"title": "エンジニアのキャリアパスについて", "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます...", "draft": false}'


curl -v -X POST 'http://localhost:8787/api/consultations' \
     -H 'Content-Type: application/json' \
     --cookie cookie_jar.txt \
     -d '{"title": "あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこん", "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます...", "draft": false}'

curl -v -X POST 'http://localhost:8787/api/consultations' \
     -H 'Content-Type: application/json' \
     --cookie cookie_jar.txt \
     -d '{"title": "", "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます...", "draft": false}'

curl -v -X POST 'http://localhost:8787/api/consultations' \
     -H 'Content-Type: application/json' \
     --cookie cookie_jar.txt \
     -d '{"title": "あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこ", "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます...", "draft": false}'

curl -v -X GET 'http://localhost:8787/api/consultations' \ 
     --cookie cookie_jar.txt

curl -v -X GET 'http://localhost:8787/api/consultations' \ 
     --cookie cookie_jar.txt
