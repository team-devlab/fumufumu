import Link from "next/link";

const comparisons = [
  {
    pain: "情報はあるのに、決めきれない",
    value: "あなたの状況に絞った選択肢が整理される",
  },
  {
    pain: "動きたいのに、最初の一歩が出ない",
    value: "短期/中期のメリット・リスクを並べて判断できる",
  },
  {
    pain: "このままでいいのか、不安だけが残る",
    value: "次の一歩に落とし込める現実的な助言が得られる",
  },
] as const;

export default function TemplateComparePage() {
  return (
    <main className="min-h-screen bg-[#F4F6F8] px-6 py-12 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="border-b border-teal-100 bg-teal-50 px-8 py-4 lg:px-12">
            <p className="text-sm font-semibold text-teal-900">
              投稿は公開前に運営が確認します。きつい言葉が返ってこない場を守ります。
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-8 py-12 lg:px-12 lg:py-14">
              <p className="text-lg font-semibold leading-8 text-slate-700 md:text-xl">
                答えが出ないまま、
                <br />
                画面を閉じたあとで。
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-0.01em] md:text-5xl">
                迷いを、
                <br />
                匿名で相談できる。
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                感情だけで決めず、納得して次のアクションを選ぶための相談体験。
                ふむふむは、共感と実践のバランスで意思決定を支えます。
              </p>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-[#EAB308]"
                >
                  匿名で相談してみる
                </Link>
                <p className="mt-3 text-sm text-slate-500">
                  投稿は運営が確認します
                </p>
              </div>
            </div>

            <div className="bg-[#0F766E] px-8 py-12 text-white lg:px-10 lg:py-14">
              <h2 className="text-2xl font-black">
                きつい言葉が返ってこない場所。
              </h2>
              <p className="mt-4 text-sm leading-7 text-teal-50/90">
                投稿前に運営が確認することで、読み手にも投稿者にも安心な場を保ちます。
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="rounded-xl bg-white/10 px-4 py-3">
                  公開前チェック
                </li>
                <li className="rounded-xl bg-white/10 px-4 py-3">
                  不適切投稿の抑制
                </li>
                <li className="rounded-xl bg-white/10 px-4 py-3">
                  継続的な運営品質の維持
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-white px-8 py-12 ring-1 ring-slate-200 lg:px-12">
          <h2 className="text-2xl font-black md:text-3xl">
            迷いをそのままにしない、比較で進める
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            こういう迷い、抱えたまま止まっていませんか？
          </p>
          <div className="mt-7 grid gap-4">
            {comparisons.map((item) => (
              <article
                key={item.pain}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
              >
                <p className="text-sm leading-7 text-slate-600">{item.pain}</p>
                <span className="text-center text-xl font-black text-teal-600">
                  →
                </span>
                <p className="text-sm font-semibold leading-7 text-slate-800">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
