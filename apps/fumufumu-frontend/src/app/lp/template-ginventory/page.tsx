import Link from "next/link";

const worldviewPromises = [
  {
    title: "やさしく受け止める",
    text: "強い言葉で切り捨てるのではなく、まず悩みを受け止める。ふむふむは、その空気感から設計する相談の場です。",
  },
  {
    title: "納得できる言葉で返す",
    text: "誰かの成功談を押しつけるのではなく、その人の状況に合った現実的な助言を返す。だから次の一歩が見えやすくなります。",
  },
  {
    title: "安心して読める場を守る",
    text: "相談もアドバイスも、安心して読めることが前提。場の空気を守る運営姿勢も、ふむふむの価値のひとつです。",
  },
] as const;

export default function TemplateGinventoryPage() {
  return (
    <main className="min-h-screen bg-[#F7F8F6] text-slate-800">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(20,184,166,0.08),transparent_28%),radial-gradient(circle_at_95%_10%,rgba(245,201,74,0.10),transparent_24%)]" />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-600">
            ふむふむ worldview
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[1.25] tracking-[-0.02em] text-slate-900 md:text-5xl lg:text-6xl">
            そのもやもや、
            <br />
            ひとりで抱えず
            <br />
            <span className="text-teal-600">相談してみませんか？</span>
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-600 md:text-lg">
            ふむふむは、相談のしやすさだけでなく、相談したあとの気持ちまで設計するプロダクトです。
            下のレイアウトは、文章とプロダクト画像でその空気感を伝えるための構成案です。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8 lg:pb-28">
        <div className="relative">
          <p className="pointer-events-none absolute left-0 top-[42%] hidden select-none text-[clamp(96px,18vw,240px)] font-black tracking-[-0.06em] text-slate-300/70 lg:block">
            ふむふむ
          </p>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <article className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm lg:col-span-3">
              <div className="rounded-[18px] bg-gradient-to-br from-[#E8F7F1] via-[#DDF2EA] to-[#D2EBDD] p-3">
                <div className="flex h-44 items-center justify-center rounded-[14px] border border-emerald-100/70 bg-white/55 text-xs font-semibold text-emerald-700">
                  世界観イメージ画像（Web）
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                相談する前から「ここなら書ける」と思える空気を、視覚でも伝えます。
              </p>
            </article>

            <article className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:col-span-7 lg:col-start-5">
              <p className="text-xs font-bold tracking-[0.18em] text-slate-500">
                01
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                迷いを、そのまま言葉にする
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
                まとまっていなくても投稿できることを、画面とコピーの両方で伝えるパートです。
              </p>

              <div className="mt-6 rounded-[22px] bg-[#F8FAF9] p-5">
                <div className="mx-auto flex h-72 w-full items-center justify-center rounded-[18px] border border-emerald-100 bg-[linear-gradient(180deg,#EDF8F3,#FAFCFB)] text-xs font-semibold tracking-[0.08em] text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.08)]">
                  プロダクト画像 01（Web）
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-[#EFDFA9] bg-[#FAE9B8] p-6 text-slate-900 shadow-[0_14px_34px_rgba(217,166,13,0.18)] lg:col-span-4">
              <div className="flex h-52 w-full items-center justify-center rounded-[16px] border border-[#E4D19A] bg-[#FFF7DF] text-xs font-semibold tracking-[0.08em] text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
                プロダクト画像 02（Web）
              </div>
              <p className="mt-5 text-xs font-bold tracking-[0.16em] text-slate-700">
                02
              </p>
              <h3 className="mt-2 text-2xl font-black">視点を読み比べる</h3>
              <p className="mt-3 text-sm leading-7 text-slate-800/90">
                意見の数ではなく、納得できる視点に出会える体験を見せるパートです。
              </p>
            </article>

            <article className="overflow-hidden rounded-[30px] border border-emerald-100 bg-[#E8F4EF] text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.10)] lg:col-span-5 lg:col-start-8">
              <div className="relative h-52 bg-[linear-gradient(145deg,#E7F5EF,#D9EEE5)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_45%)]" />
                <div className="absolute left-4 top-4 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                  プロダクト画像 03（Web）
                </div>
              </div>
              <div className="px-6 pb-6 pt-5">
                <p className="text-xs font-bold tracking-[0.16em] text-teal-700">
                  03
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  落ち着いて次の一歩を決める
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  きつい言葉が返ってこない空気と、公開前の投稿確認による安心感を体験として伝えます。
                </p>
              </div>
            </article>
          </div>

          <section className="mt-20 rounded-[36px] bg-[#E9EFED] px-6 py-12 ring-1 ring-slate-200/90 lg:px-10 lg:py-14">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                worldview
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                ふむふむが伝えたい、3つの空気感
              </h3>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {worldviewPromises.map((promise) => (
                <article
                  key={promise.title}
                  className="rounded-[30px] border border-slate-200 bg-[#F2F6F5] p-7 shadow-sm"
                >
                  <div className="mb-5 h-12 w-12 rounded-2xl bg-teal-100" />
                  <p className="text-2xl font-black text-slate-900">
                    {promise.title}
                  </p>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    {promise.text}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="px-6 pb-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[36px] bg-gradient-to-r from-teal-600 to-emerald-500 px-8 py-12 text-white shadow-[0_24px_80px_rgba(13,148,136,0.30)] lg:px-12 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                まずは、いま抱えている迷いを
                <br />
                ひとつだけ書いてみる。
              </h2>
              <p className="mt-4 text-base leading-8 text-teal-50/90">
                匿名で投稿でき、公開前には運営が確認します。安心できるところから、次の一歩を始めましょう。
              </p>
              <div className="mt-7">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
                >
                  相談してみる
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
