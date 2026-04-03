export default function FumufumuLPWorldview() {
  const steps = [
    {
      no: "STEP 1",
      title: "迷いをそのまま書き出す",
      text: "頭の中で散らばった迷いを、匿名でそのまま言葉にする。整理されていなくても、悩みの骨格が見えてきます。",
    },
    {
      no: "STEP 2",
      title: "経験と助言を読み比べる",
      text: "似た状況の投稿と回答を読み比べながら、ひとつの見方に偏らず判断材料を増やせます。",
    },
    {
      no: "STEP 3",
      title: "次の判断をひとつ決める",
      text: "公開前の投稿確認で場の安心感を保ちながら、いまの自分に必要な行動をひとつ決められます。",
    },
  ];

  const _faqs = [
    {
      q: "ふむふむは、どんな場所ですか？",
      a: "エンジニアがキャリアの悩みを安心して相談し、納得して次のアクションにつなげるための相談プラットフォームです。",
    },
    {
      q: "きつい反応が来るのが不安です",
      a: "心理的安全性を大切にした世界観を前提に、安心して相談しやすい場づくりを重視しています。",
    },
    {
      q: "どんな悩みを相談できますか？",
      a: "年収、転職、働く環境、学習方針、キャリアの方向性など、エンジニアの仕事と将来にまつわる悩み全般を想定しています。",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F1F3F4] text-slate-800">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#F4F5F6]" />

        <div className="absolute left-[4%] top-[6%] h-16 w-16 rounded-full bg-[#9EDFE1]/75" />
        <div className="absolute left-[35%] -top-16 h-64 w-64 rounded-full bg-[#D7E4A6]/70" />
        <div className="absolute right-[3%] top-[8%] h-16 w-16 rounded-full bg-[#9EDFE1]/75" />
        <div className="absolute left-[20%] top-[18%] h-24 w-24 rounded-full bg-[#BFAEEB]/68" />
        <div className="absolute left-[28%] top-[16%] h-44 w-44 rounded-full bg-[#A7B4E9]/62" />
        <div className="absolute left-[42%] top-[27%] h-8 w-8 rounded-full bg-[#CFE1A3]/75" />
        <div className="absolute left-[2%] top-[29%] h-56 w-56 rounded-full bg-[#ABE4BE]/68" />
        <div className="absolute right-[24%] top-[30%] h-52 w-52 rounded-full bg-[#ABE4BE]/68" />
        <div className="absolute right-[-5%] top-[17%] h-20 w-20 rounded-full bg-[#BFAEEB]/66" />
        <div className="absolute right-[13%] top-[42%] h-36 w-36 rounded-full bg-[#8FCFE5]/72" />
        <div className="absolute left-[36%] bottom-[-11rem] h-72 w-72 rounded-full bg-[#D7E4A6]/68" />
        <div className="absolute right-[-8%] bottom-[26%] h-24 w-24 rounded-full bg-[#9EDFE1]/74" />
      </div>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[90svh] max-w-6xl items-center px-6 py-16 lg:min-h-[96svh] lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-black leading-[1.16] tracking-[-0.02em] text-slate-900 md:text-7xl lg:text-[72px]">
              <span className="block lg:whitespace-nowrap">
                エンジニアキャリアのもやもや
              </span>
              <span className="block text-teal-600 lg:whitespace-nowrap">
                相談してみませんか？
              </span>
            </h1>

            <div className="mt-14 flex flex-col items-center gap-3 sm:mt-16 sm:flex-row">
              <button
                type="button"
                className="rounded-2xl bg-[#F5C94A] px-10 py-5 text-lg font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#EAB308]"
              >
                相談してみる
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              匿名で投稿でき、公開前には運営が確認します
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-8 lg:pb-24 lg:pt-14">
          <div className="mx-auto max-w-4xl space-y-4">
            {steps.map((step) => (
              <div
                key={step.no}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 min-w-[86px] shrink-0 items-center justify-center rounded-xl bg-teal-600 px-3 text-sm font-black tracking-[0.08em] text-white sm:h-12 sm:min-w-[94px]">
                    {step.no}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {step.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[36px] bg-gradient-to-r from-teal-600 to-emerald-500 px-8 py-12 text-white shadow-[0_24px_80px_rgba(13,148,136,0.30)] lg:px-12 lg:py-14">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                  まずは、いま気になっていることを
                  <br />
                  ひとつだけ書いてみる。
                </h2>
                <div className="mt-7 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#EAB308]"
                  >
                    相談してみる
                  </button>
                  <p className="text-sm text-teal-50/80">
                    登録は1分。匿名で投稿でき、公開前には運営が確認します。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
