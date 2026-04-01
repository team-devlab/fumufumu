import Link from "next/link";

const steps = [
  {
    no: "01",
    title: "迷いを匿名で置いてみる",
    text: "まとまっていなくても大丈夫。いまの迷いを言葉にすることで、悩みの輪郭が少しずつ見えてきます。",
    hint: "匿名で投稿できる設計",
    visual:
      "from-[#E8F7F1] via-[#DBF2E9] to-[#CFEBDD] bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.72),transparent_45%)]",
  },
  {
    no: "02",
    title: "経験と助言を読み比べる",
    text: "似た悩みへの回答に触れながら、ひとつの見方に偏らず判断材料を増やしていけます。",
    hint: "自分に合う視点を選べる",
    visual:
      "from-[#E3F6EE] via-[#D5F0E6] to-[#C8E9DB] bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.7),transparent_44%)]",
  },
  {
    no: "03",
    title: "安心できる空気を守りながら進む",
    text: "相談投稿もアドバイス投稿も、公開前に運営が確認します。投稿チェック方針にもとづき、不適切な内容を抑制します。",
    hint: "公開前の投稿チェックを実施",
    visual:
      "from-[#ECF8F3] via-[#DFF3EA] to-[#D1ECDC] bg-[radial-gradient(circle_at_74%_16%,rgba(255,255,255,0.72),transparent_42%)]",
  },
] as const;

export default function FumufumuLPWorldviewFlow() {
  return (
    <main className="min-h-screen bg-[#F7F8F6] text-slate-800">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_22%)]" />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-8 lg:pb-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
          <h1 className="mt-8 text-4xl font-black leading-[1.4] tracking-[-0.01em] text-slate-900 md:text-5xl lg:text-6xl">
            悩みを話す前から、
            <br />
            <span className="text-teal-600">安心できる</span>
            <br />
            と感じられる場所へ。
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            ふむふむは、エンジニアのキャリアの悩みに対して、やさしく、実践的に、納得感のある言葉が返ってくる場を目指しています。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="rounded-2xl bg-[#F5C94A] px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
            >
              相談してみる
            </Link>
            <p className="text-sm text-slate-500">
              投稿は公開前に運営が確認します
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
            Flow
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            ふむふむがわかる、3つの流れ
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            相談する人も、読む人も、安心しながら次の一歩に進めるように設計しています。
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {steps.map((step, index) => (
            <article
              key={step.no}
              className={`grid items-center gap-6 md:grid-cols-2 ${index > 0 ? "border-t border-slate-200 pt-10" : ""}`}
            >
              <div
                className={
                  index % 2 === 0 ? "order-1 md:order-1" : "order-1 md:order-2"
                }
              >
                <div
                  className={`relative h-56 overflow-hidden rounded-[24px] bg-gradient-to-br md:h-64 ${step.visual}`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.3),rgba(167,243,208,0.1)_45%,rgba(16,185,129,0.08))]" />
                </div>
              </div>

              <div
                className={
                  index % 2 === 0 ? "order-2 md:order-2" : "order-2 md:order-1"
                }
              >
                <p className="text-xs font-bold tracking-[0.18em] text-emerald-700">
                  STEP {step.no}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
                <p className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {step.hint}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[36px] bg-gradient-to-r from-teal-600 to-emerald-500 px-8 py-12 text-white shadow-[0_24px_80px_rgba(13,148,136,0.30)] lg:px-12 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                まずは、いま抱えている迷いを
                <br />
                ひとつ書いてみる。
              </h2>
              <p className="mt-4 text-base leading-8 text-teal-50/90">
                完璧に整理されていなくて大丈夫です。言葉にすると、次に進むための視点が見えやすくなります。
              </p>
              <div className="mt-7">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
                >
                  匿名で相談を投稿する
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
