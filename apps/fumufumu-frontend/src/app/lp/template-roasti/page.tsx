import Link from "next/link";

const experienceSteps = [
  {
    no: "01",
    title: "迷いを、そのまま言葉にする",
    text: "まとまっていなくても大丈夫。いまの迷いを短く書くだけで、悩みの輪郭が少しずつ見えてきます。",
    imageLabel: "プロダクト画像 01 (Web)",
    cardTone:
      "bg-[#F7FAF9] ring-1 ring-[#D7E3E5] shadow-[0_26px_52px_rgba(15,27,61,0.08)]",
    imageTone:
      "bg-gradient-to-br from-[#EAF8F3] via-[#DDF3EA] to-[#D0ECDF] border-[#BFE6D3]",
  },
  {
    no: "02",
    title: "経験と助言を、静かに読み比べる",
    text: "意見の数ではなく、納得できる視点に出会えることを大切にしています。自分に合う判断材料を増やせます。",
    imageLabel: "プロダクト画像 02 (Web)",
    cardTone:
      "bg-[#F8F2DD] ring-1 ring-[#E5D7A7] shadow-[0_26px_52px_rgba(134,94,0,0.12)]",
    imageTone:
      "bg-gradient-to-br from-[#F8EFCF] via-[#F1E5BE] to-[#EADBA9] border-[#DCC98D]",
  },
  {
    no: "03",
    title: "安心できる空気のなかで、次を決める",
    text: "きつい言葉が返ってこない場を守るために、投稿は公開前に運営が確認。落ち着いて次の一歩を決められます。",
    imageLabel: "プロダクト画像 03 (Web)",
    cardTone:
      "bg-[#DDF0EB] ring-1 ring-[#BBDDD4] shadow-[0_28px_56px_rgba(15,124,115,0.18)]",
    imageTone:
      "bg-gradient-to-br from-[#D9F0E8] via-[#CCE8DE] to-[#BEDFD2] border-[#9FD0C0]",
  },
] as const;

const valueCards = [
  {
    title: "やさしく受け止める",
    text: "迷いをすぐに評価せず、まず状況を受け止める空気を大切にしています。",
  },
  {
    title: "納得できる視点を返す",
    text: "押しつけではなく、いまの自分に合う判断軸を見つけやすくします。",
  },
  {
    title: "安心して読める場を守る",
    text: "投稿は公開前に運営が確認し、不安なく使える環境を保ちます。",
  },
] as const;

export default function TemplateRoastiPage() {
  return (
    <main className="min-h-screen bg-[#F1F3F2] text-[#0F1B3D]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_8%,rgba(15,154,141,0.14),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(245,201,74,0.14),transparent_26%),radial-gradient(circle_at_90%_85%,rgba(15,27,61,0.08),transparent_24%)]"
        aria-hidden="true"
      />

      <section className="mx-auto max-w-[1320px] px-6 pb-24 pt-16 lg:px-10 lg:pb-32 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-sm font-bold tracking-[0.24em] text-[#0F9A8D]">
              FUMUFUMU
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[1.12] tracking-[-0.02em] text-[#0F1B3D] md:text-6xl lg:text-7xl">
              そのもやもや、
              <br />
              ひとりで抱えず
              <br />
              <span className="text-[#0F9A8D]">相談してみませんか？</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#3E4B6A] md:text-lg">
              ふむふむは、迷いを言語化し、他者の経験に触れ、納得して次の行動へ進むための相談サービスです。
              静かで安心できる空気を、体験として届けます。
            </p>
            <div className="mt-9 flex flex-col items-start gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-[#F2C84B] px-8 py-4 text-base font-bold text-[#0F1B3D] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
              >
                相談してみる
              </Link>
              <p className="text-sm text-[#5A6784]">
                匿名で投稿でき、公開前には運営が確認します
              </p>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-[34px] border border-[#D4DEE5] bg-[#F6F9F8] p-5 shadow-[0_24px_54px_rgba(15,27,61,0.1)]">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-[#CDEADF] via-[#DBF1EA] to-[#F0F7F4]" />
              <div className="relative mt-9 rounded-[24px] border border-[#BFE6D3] bg-gradient-to-br from-[#ECF8F4] to-[#D6EBDD] p-6">
                <div className="h-[270px] rounded-[20px] border border-white/65 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.72),transparent_45%),linear-gradient(135deg,#E8F7F1,#D4ECDF)]" />
                <p className="mt-4 text-center text-sm font-semibold text-[#49608A]">
                  プロダクト画像 (Web)
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-6 -left-6 rounded-2xl bg-[#0F9A8D]/10 px-5 py-3 text-xs font-bold tracking-[0.18em] text-[#0F8078]">
              WORLDVIEW
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-6 pb-24 lg:px-10 lg:pb-32">
        <div className="mb-14 text-center">
          <p className="text-sm font-bold tracking-[0.24em] text-[#0F9A8D]">
            EXPERIENCE
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.01em] text-[#0F1B3D] md:text-5xl">
            ふむふむを、
            <br />
            3つの体験で知る
          </h2>
        </div>

        <div className="space-y-28">
          {experienceSteps.map((step, index) => (
            <article key={step.no} className="relative">
              <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-7"
                      : "lg:col-span-7 lg:col-start-6"
                  }
                >
                  <div className={`rounded-[34px] p-6 lg:p-8 ${step.cardTone}`}>
                    <div
                      className={`h-[280px] rounded-[24px] border md:h-[360px] lg:h-[420px] ${step.imageTone}`}
                    >
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-sm font-semibold tracking-[0.08em] text-[#4A668D]">
                          {step.imageLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-5"
                      : "lg:col-span-5 lg:col-start-1 lg:row-start-1"
                  }
                >
                  <p className="text-7xl font-black leading-none tracking-[-0.04em] text-[#0F1B3D]/26 md:text-8xl lg:text-9xl">
                    {step.no}
                  </p>
                  <h3 className="mt-3 text-3xl font-black leading-tight tracking-[-0.01em] text-[#0F1B3D] md:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-8 text-[#3E4B6A]">
                    {step.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8 lg:pb-28">
        <div className="rounded-[34px] border border-[#D4DEE5] bg-[#F4F7F6] px-8 py-10 shadow-[0_14px_34px_rgba(15,27,61,0.08)] lg:px-12">
          <p className="text-sm font-bold tracking-[0.22em] text-[#0F9A8D]">
            WORLDVIEW
          </p>
          <h2 className="mt-3 text-3xl font-black text-[#0F1B3D] md:text-4xl">
            ふむふむが守る、3つの約束
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {valueCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-[#D7E3E5] bg-white p-6"
              >
                <h3 className="text-2xl font-black text-[#0F1B3D]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#3E4B6A]">
                  {card.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-6xl rounded-[36px] bg-gradient-to-r from-[#0F8E82] to-[#11A79A] px-8 py-12 text-white shadow-[0_24px_70px_rgba(15,142,130,0.26)] lg:px-12 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">
              まずは、いまの迷いを
              <br />
              ひとつだけ書いてみる。
            </h2>
            <p className="mt-4 text-base leading-8 text-teal-50/90">
              完璧に整理されていなくて大丈夫です。短く書くだけで、次の一歩を決める視点が見えてきます。
            </p>
            <div className="mt-7">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-[#F2C84B] px-8 py-4 text-base font-bold text-[#0F1B3D] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
              >
                相談してみる
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
