"use client";

import toast from "react-hot-toast";

const REDIRECT_PATH = "/login?redirect=%2Fconsultations%2Fnew";

const showPattern1 = () => {
  toast("⚠️ セッションが切れました。再ログインしてください", {
    duration: 2800,
    style: {
      border: "1px solid #F5D48A",
      background: "#FFF8E6",
      color: "#5C4300",
      borderRadius: "12px",
      padding: "12px 14px",
      fontWeight: "600",
    },
  });
};

const showPattern2 = () => {
  toast(
    "⚠️ ログイン期限が切れました。2秒後にログイン画面へ移動します",
    {
      duration: 2200,
      style: {
        border: "1px solid #A7F3D0",
        background: "#ECFEF6",
        color: "#0F4D3F",
        borderRadius: "14px",
        padding: "12px 14px",
      },
    },
  );
};

const showPattern3 = () => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } pointer-events-auto w-[360px] max-w-[92vw] rounded-2xl border border-teal-200 bg-white shadow-lg`}
      >
        <div className="p-4">
          <p className="text-sm font-bold text-gray-800">
            ⚠️ セッションが切れました
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ログイン後にこの画面へ戻れます。
          </p>
          <div className="mt-3 flex justify-end">
            <a
              href={REDIRECT_PATH}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              ログインへ
            </a>
          </div>
        </div>
      </div>
    ),
    { duration: 4000 },
  );
};

export default function SessionToastPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">セッション切れトースト検証</h2>
      <p className="text-sm text-gray-500">
        fumufumuの配色トーンに合わせた3パターンです。文言先頭に ⚠️ を入れています。
      </p>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">パターン1: 警告トーン（黄系）</h3>
        <p className="text-sm text-gray-500">
          まず気づかせる用途。短く明確に再ログインを促します。
        </p>
        <button
          type="button"
          onClick={showPattern1}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          パターン1を表示
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">パターン2: 自動遷移を想定（teal系）</h3>
        <p className="text-sm text-gray-500">
          投稿/保存で401を受けた瞬間に出す想定。実運用時は2秒後に自動遷移を追加します。
        </p>
        <button
          type="button"
          onClick={showPattern2}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          パターン2を表示
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">パターン3: トースト内導線付き</h3>
        <p className="text-sm text-gray-500">
          トースト内に「ログインへ」導線を置く案。すぐ遷移したいときに使います。
        </p>
        <button
          type="button"
          onClick={showPattern3}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          パターン3を表示
        </button>
      </section>
    </div>
  );
}
