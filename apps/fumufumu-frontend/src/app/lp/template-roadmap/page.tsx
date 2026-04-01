import Link from "next/link";

const empathyScenes = [
  "答えが出ないまま、今日も検索だけで終わってしまう",
  "誰かに相談したいのに、否定されるのが怖くて書けない",
  "何を選ぶべきかより、何から考えるべきかで止まっている",
  "自分だけ遅れている気がして、余計に動けなくなる",
] as const;

const changeFlow = [
  {
    no: "01",
    title: "迷いを言葉にする",
    before: "頭の中が散らかっていて、何に悩んでいるのか説明できない",
    after: "投稿を作る過程で、悩みの骨格が見える",
    visual:
      "from-[#E8F7F1] via-[#DBF2E9] to-[#CFEBDD] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.75),transparent_46%)]",
  },
  {
    no: "02",
    title: "他人の経験を読む",
    before: "自分の視点だけで考えてしまい、判断材料が増えない",
    after: "似た経験や回答を読み比べて、選択肢の見え方が変わる",
    visual:
      "from-[#E3F6EE] via-[#D5F0E6] to-[#C8E9DB] bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.68),transparent_44%)]",
  },
  {
    no: "03",
    title: "次の一歩を決める",
    before: "迷い続けて、行動を後回しにしてしまう",
    after: "納得できる視点をもとに、いま取る行動を1つ決められる",
    visual:
      "from-[#ECF8F3] via-[#DFF3EA] to-[#D1ECDC] bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.72),transparent_42%)]",
  },
] as const;

const safetyPoints = [
  "投稿は公開前に運営が確認",
  "不適切な内容は公開前に抑制",
  "安心して読める空気を継続的に維持",
] as const;

export default function TemplateRoadmapPage() {
  return (
    <main className="min-h-screen bg-[#F5F7F6] px-6 py-12 text-slate-900 lg:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,0.14),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.10),transparent_34%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl space-y-14">
        <section className="rounded-[36px] border border-emerald-100 bg-white px-8 py-14 shadow-[0_22px_60px_rgba(16,185,129,0.12)] lg:px-12">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.01em] md:text-5xl">
            迷いを、
            <br />
            匿名で相談できる。
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            ふむふむは、悩みを言語化し、他人の経験から学び、
            納得して次のアクションにつなげるための相談の場です。
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
            >
              匿名で相談してみる
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              投稿は公開前に運営が確認します
            </p>
          </div>
        </section>

        <section
          id="empathy"
          className="rounded-[32px] bg-[#EAF7F4] px-8 py-11 ring-1 ring-emerald-100 lg:px-12"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-black md:text-3xl">
              こんな迷いを抱えたまま、
              <br />
              止まっていませんか？
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              迷いは、弱さではありません。整理のための対話が足りないだけです。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {empathyScenes.map((scene) => (
              <article
                key={scene}
                className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
              >
                <p className="text-sm leading-7 text-slate-700">{scene}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-8 py-10 lg:px-12">
          <h2 className="text-2xl font-black md:text-3xl">
            相談すると、こう変わる
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            1ステップごとに、テキストとビジュアルを左右交互に配置しています。
            ビジュアル部分は、あとで実画像に差し替えできる枠です。
          </p>
          <div className="mt-8 space-y-6">
            {changeFlow.map((item, index) => (
              <article key={item.title} className="pb-6 md:pb-8">
                <div className="grid items-center gap-5 md:grid-cols-2 md:gap-8">
                  <div
                    className={
                      index % 2 === 1
                        ? "order-2 md:order-1"
                        : "order-2 md:order-2"
                    }
                  >
                    <p className="text-xs font-bold tracking-[0.18em] text-emerald-700">
                      STEP {item.no}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.01em] text-slate-900">
                      {item.title}
                    </h3>
                    <dl className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                      <div>
                        <dt className="inline font-bold text-slate-700">
                          相談前:{" "}
                        </dt>
                        <dd className="inline">{item.before}</dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-slate-700">
                          相談後:{" "}
                        </dt>
                        <dd className="inline">{item.after}</dd>
                      </div>
                    </dl>
                  </div>
                  <div
                    className={
                      index % 2 === 1
                        ? "order-1 md:order-2"
                        : "order-1 md:order-1"
                    }
                  >
                    <div
                      className={`relative h-56 overflow-hidden rounded-[22px] bg-gradient-to-br md:h-64 ${item.visual}`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),rgba(167,243,208,0.10)_45%,rgba(16,185,129,0.08))]" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] bg-[#0F766E] px-8 py-10 text-white shadow-[0_18px_44px_rgba(15,118,110,0.30)] lg:px-12">
          <h2 className="text-2xl font-black md:text-3xl">
            きつい言葉が返ってこない場所。
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-teal-50/90">
            相談もアドバイスも、公開前に投稿チェック方針にもとづいて運営が確認します。
            不安なく相談できる空気を、仕組みとして守っています。
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {safetyPoints.map((point) => (
              <p
                key={point}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm"
              >
                {point}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] bg-white px-8 py-10 text-center ring-1 ring-slate-200 lg:px-12">
          <h2 className="text-2xl font-black md:text-3xl">
            まずは、いまの迷いをひとつだけ書いてみる。
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            完璧に整理されていなくて大丈夫です。言葉にした瞬間から、次の行動は決めやすくなります。
          </p>
          <div className="mt-7">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
            >
              匿名で相談してみる
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
