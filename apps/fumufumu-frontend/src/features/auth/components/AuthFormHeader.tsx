import Image from "next/image";

/**
 * ログイン画面とアカウント作成画面の共通ヘッダー（ロゴとサービスの説明）。
 * どちらの画面でも同じ見え方にするため1か所にまとめる。
 */
export const AuthFormHeader = () => {
  return (
    <div className="text-center">
      <div className="mx-auto w-full max-w-[424px]">
        <Image
          src="/fumufumu-login-logo-lockup.svg"
          alt="ふむふむ"
          width={1100}
          height={420}
          priority
          className="h-auto w-full"
        />
      </div>
      <p className="mt-5 text-[18px] font-semibold tracking-tight text-[#0F9F92] sm:text-[19px]">
        エンジニアのお悩み相談プラットフォーム
      </p>
    </div>
  );
};
