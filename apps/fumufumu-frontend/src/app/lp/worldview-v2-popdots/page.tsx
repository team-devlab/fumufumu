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
        <div className="absolute inset-0 bg-[#F4F6F7]" />

        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[repeating-linear-gradient(45deg,rgba(124,203,147,0.58)_0_14px,transparent_14px_28px)]" />
        <div className="absolute left-[21%] -top-24 h-72 w-72 rounded-full bg-[repeating-linear-gradient(45deg,rgba(207,227,142,0.62)_0_15px,transparent_15px_30px)]" />
        <div className="absolute left-[43%] -top-10 h-24 w-24 rounded-full border-4 border-[#7CCB93] bg-transparent" />
        <div className="absolute left-[55%] -top-8 h-28 w-28 rounded-full bg-[#F2CD73]/78" />
        <div className="absolute right-[28%] top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,#C9B8EE_2px,transparent_2px)] [background-size:13px_13px] opacity-72" />
        <div className="absolute right-[13%] top-14 h-56 w-56 rounded-full bg-[repeating-linear-gradient(45deg,rgba(242,205,115,0.74)_0_14px,transparent_14px_28px)]" />
        <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[repeating-linear-gradient(45deg,rgba(246,198,217,0.60)_0_14px,transparent_14px_28px)]" />
        <div className="absolute right-[6%] -top-9 h-32 w-32 rounded-full bg-[#F6C6D9]/82" />
        <div className="absolute left-[9%] top-[19%] h-32 w-32 rounded-full bg-[#F2CD73]/64" />

        <div className="absolute -left-24 top-[37%] h-64 w-64 rounded-full bg-[repeating-linear-gradient(45deg,rgba(201,184,238,0.62)_0_13px,transparent_13px_26px)]" />
        <div className="absolute left-[14%] top-[29%] h-36 w-36 rounded-full bg-[radial-gradient(circle,#7CCB93_2px,transparent_2px)] [background-size:13px_13px] opacity-70" />
        <div className="absolute right-[18%] top-[38%] h-32 w-32 rounded-full bg-[#C9B8EE]/78" />
        <div className="absolute right-[-6%] top-[31%] h-40 w-40 rounded-full bg-[radial-gradient(circle,#CFE38E_2px,transparent_2px)] [background-size:13px_13px] opacity-65" />
        <div className="absolute right-[8%] top-[52%] h-28 w-28 rounded-full border-4 border-[#7CCB93] bg-transparent" />
        <div className="absolute left-[17%] top-[46%] h-24 w-24 rounded-full border-4 border-[#F2CD73]/85 bg-transparent" />

        <div className="absolute -left-20 bottom-[7%] h-56 w-56 rounded-full bg-[repeating-linear-gradient(45deg,rgba(124,203,147,0.58)_0_14px,transparent_14px_28px)]" />
        <div className="absolute left-[22%] bottom-[6%] h-[136px] w-[136px] rounded-full bg-[#7CCB93]/84" />
        <div className="absolute left-[38%] bottom-[4%] h-32 w-32 rounded-full bg-[radial-gradient(circle,#F6C6D9_2px,transparent_2px)] [background-size:13px_13px] opacity-68" />
        <div className="absolute right-[19%] bottom-[-8%] h-72 w-72 rounded-full bg-[repeating-linear-gradient(45deg,rgba(242,205,115,0.72)_0_14px,transparent_14px_28px)]" />
        <div className="absolute -right-20 bottom-[7%] h-56 w-56 rounded-full bg-[repeating-linear-gradient(45deg,rgba(201,184,238,0.62)_0_14px,transparent_14px_28px)]" />
        <div className="absolute right-[9%] bottom-[16%] h-32 w-32 rounded-full border-4 border-[#C9B8EE] bg-transparent" />
        <div className="absolute right-[35%] bottom-[8%] h-[104px] w-[104px] rounded-full border-4 border-[#CFE38E]/85 bg-transparent" />

        <div className="absolute left-[24%] top-[29%] text-3xl text-[#7CCB93]/85">
          *
        </div>
        <div className="absolute left-[11%] top-[41%] text-2xl text-[#F2CD73]/85">
          *
        </div>
        <div className="absolute right-[24%] top-[21%] text-3xl text-[#C9B8EE]/85">
          *
        </div>
        <div className="absolute right-[31%] top-[44%] text-2xl text-[#F6C6D9]/85">
          *
        </div>
        <div className="absolute right-[10%] bottom-[27%] text-3xl text-[#7CCB93]/85">
          *
        </div>
        <div className="absolute left-[17%] bottom-[20%] text-2xl text-[#CFE38E]/85">
          *
        </div>
      </div>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[90svh] max-w-6xl items-center px-6 py-16 lg:min-h-[96svh] lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
            <p className="mb-5 text-xs font-bold tracking-[0.2em] text-teal-600 sm:text-sm">
              エンジニアキャリア相談サービス ふむふむ
            </p>
            <h1 className="text-5xl font-black leading-[1.16] tracking-[-0.02em] text-slate-900 md:text-7xl lg:text-[72px]">
              <span className="block lg:whitespace-nowrap">
                キャリアのもやもや
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
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              ふむふむまでの3ステップ
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-4xl space-y-4">
            {steps.map((step) => (
              <div
                key={step.no}
                className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-7 sm:py-8"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-12 min-w-[94px] shrink-0 items-center justify-center rounded-2xl bg-teal-600 px-3 text-sm font-black tracking-[0.08em] text-white sm:h-14 sm:min-w-[106px] sm:text-base">
                    {step.no}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.01em] text-slate-900 sm:text-[34px] sm:leading-[1.15]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-lg sm:leading-[1.6]">
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
                  ふむふむで、いま気になっていることを
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
