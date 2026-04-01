import Link from "next/link";

const stepCards = [
  {
    no: "01",
    title: "迷いを書き出す",
    body: "まとまっていなくても、そのまま言葉にします。書くほどに、悩みの輪郭が見えてきます。",
    point: "匿名で相談を投稿",
    visual:
      "from-[#E8F7F1] via-[#DBF2E9] to-[#CFEBDD] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.75),transparent_46%)]",
  },
  {
    no: "02",
    title: "経験を読み比べる",
    body: "似た状況の投稿や回答を読むことで、ひとつの見方に偏らず、判断の材料を増やせます。",
    point: "他者の視点を取り込む",
    visual:
      "from-[#E3F6EE] via-[#D5F0E6] to-[#C8E9DB] bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.68),transparent_44%)]",
  },
  {
    no: "03",
    title: "次の一歩を決める",
    body: "完璧な結論ではなくても大丈夫。今の自分にとって納得できる行動を、ひとつ決めて進めます。",
    point: "すぐ動ける行動に落とし込む",
    visual:
      "from-[#ECF8F3] via-[#DFF3EA] to-[#D1ECDC] bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.72),transparent_42%)]",
  },
] as const;

export default function TemplateTinyshotsPage() {
  return (
    <main className="min-h-screen bg-[#F5F7F6] px-6 py-12 text-slate-900 lg:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.12),transparent_38%),radial-gradient(circle_at_84%_8%,rgba(14,165,233,0.10),transparent_34%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl space-y-12">
        <section className="rounded-[34px] border border-emerald-100 bg-white px-8 py-12 shadow-[0_22px_60px_rgba(16,185,129,0.12)] lg:px-12">
          <p className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-emerald-700">
            ふむふむ LP案
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.01em] md:text-5xl">
            迷いを、匿名で相談できる。
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            ふむふむは、悩みを言語化し、経験の視点を取り込み、
            次のアクションへつなげるための相談の場です。
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-[#EAB308]"
            >
              匿名で相談してみる
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              投稿は公開前に運営が確認します
            </p>
          </div>
        </section>

        <section className="px-2 py-2 lg:px-4">
          <h2 className="text-2xl font-black md:text-3xl">3つの流れ</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            テキストとビジュアルを交互に配置した構成です。
            画像は後から差し替えできるプレースホルダーになっています。
          </p>

          <div className="mt-8 space-y-6">
            {stepCards.map((step, index) => (
              <article
                key={step.no}
                className="border-b border-slate-200 pb-6 last:border-b-0 md:pb-8"
              >
                <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8">
                  <div
                    className={
                      index % 2 === 0
                        ? "order-1 md:order-1"
                        : "order-1 md:order-2"
                    }
                  >
                    <div
                      className={`relative h-56 overflow-hidden rounded-[22px] bg-gradient-to-br md:h-64 ${step.visual}`}
                    >
                      <div className="pointer-events-none absolute inset-0 border border-emerald-100/80" />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),rgba(167,243,208,0.10)_45%,rgba(16,185,129,0.08))]" />
                    </div>
                  </div>

                  <div
                    className={
                      index % 2 === 0
                        ? "order-2 md:order-2"
                        : "order-2 md:order-1"
                    }
                  >
                    <p className="text-xs font-bold tracking-[0.18em] text-emerald-700">
                      手順 {step.no}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {step.body}
                    </p>
                    <p className="mt-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {step.point}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
