/**
 * ログイン画面とアカウント作成画面で共有する見た目。
 *
 * 以前は画面ごとに別々のクラスを書いていたため、片方だけが整えられて
 * もう片方が取り残された（アカウント作成画面にカードの枠がなく、入力欄が
 * 画面の端まで伸びていた）。同じ値を1か所から使うことで再発を防ぐ。
 */

/** 画面中央に置く外枠。左右に余白を残しつつ最大幅を揃える。 */
export const AUTH_CONTAINER_CLASS = "mx-auto w-[calc(100%-32px)] max-w-[424px]";

/** フォームを載せる白いカード。 */
export const AUTH_CARD_CLASS =
  "rounded-[20px] border border-[rgba(126,231,220,0.6)] bg-white px-7 py-8 shadow-[0_12px_26px_rgba(13,85,77,0.12)] sm:px-8 sm:py-9";

/** 入力欄の見出し。 */
export const AUTH_LABEL_CLASS =
  "block text-left text-[14px] font-semibold text-[#0F8F84]";

/** 入力欄。 */
export const AUTH_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[rgba(126,231,220,0.5)] bg-white px-3 text-[14px] text-slate-700 placeholder:text-[13px] placeholder:text-slate-400 transition focus:border-[rgba(15,159,146,0.8)] focus:outline-none focus:ring-2 focus:ring-[rgba(15,159,146,0.2)]";

/** 送信ボタン。 */
export const AUTH_SUBMIT_BUTTON_CLASS =
  "h-11 w-full rounded-xl bg-[#0F9F92] text-[15px] font-semibold text-white shadow-none transition hover:bg-[#0C8F84] disabled:bg-[#70CFC5]";

/** 入力欄に添える補足。 */
export const AUTH_HINT_CLASS = "text-left text-xs text-slate-400";

/** カードの下に置く、もう一方の画面への導線。 */
export const AUTH_FOOTER_TEXT_CLASS = "mt-6 text-center text-sm text-slate-500";

/** 導線のリンク。 */
export const AUTH_FOOTER_LINK_CLASS =
  "font-semibold text-[#0F9F92] hover:text-[#0C8F84] hover:underline";

/** エラーや案内を出す帯。 */
export const AUTH_NOTICE_CLASS = "mb-5 rounded-xl border px-4 py-3 text-sm";
