export default function FumufumuLPWorldview() {
  const worldviewPoints = [
    {
      title: "やさしく受け止める",
      text: "強い言葉で切り捨てるのではなく、まず状況を受け止める。書き出しやすい空気から、判断の土台を整えます。",
    },
    {
      title: "納得できる判断軸を返す",
      text: "誰かの成功談を押しつけるのではなく、状況に合った視点を返す。だから、次に何を選ぶかを決めやすくなります。",
    },
    {
      title: "安心して比較できる場を守る",
      text: "投稿は公開前に運営が確認し、安心して読み比べられる状態を維持。落ち着いて判断できる環境を守ります。",
    },
  ];

  const scenes = [
    "情報はあるのに、どれを選べばいいか決めきれない",
    "相談したいのに、否定されるのが怖くて書き出せない",
    "一人で考え続けて、次に取る行動だけが決まらない",
  ];

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
        <section className="mx-auto flex min-h-[100svh] max-w-6xl items-center px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-black leading-[1.16] tracking-[-0.02em] text-slate-900 md:text-7xl lg:text-[72px]">
              <span className="block lg:whitespace-nowrap">
                エンジニアキャリアのもやもや
              </span>
              <span className="block text-teal-600 lg:whitespace-nowrap">
                相談してみませんか？
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600 md:text-[22px] md:leading-10">
              ふむふむは、やさしさだけで終わらず、納得して次の判断に進むための相談サービスです。
              不安を小さくしながら、判断材料を増やしていける場を目指しています。
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                className="rounded-2xl bg-[#F5C94A] px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#EAB308]"
              >
                相談してみる
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              匿名で投稿でき、公開前には運営が確認します
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
              Scene
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              こういう迷いで、
              <br />
              止まっていませんか？
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              焦って答えを出すより、判断材料を増やして決めるほうが前に進みやすい。
              ふむふむは、そのための相談の入口です。
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {scenes.map((scene) => (
              <div
                key={scene}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 h-11 w-11 rounded-2xl bg-amber-100" />
                <p className="text-base leading-8 text-slate-700">{scene}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                Worldview
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                ふむふむが守る、3つの約束
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {worldviewPoints.map((point) => (
                <div
                  key={point.title}
                  className="rounded-[28px] bg-[#F8FBFA] p-7 ring-1 ring-slate-200"
                >
                  <div className="mb-5 h-12 w-12 rounded-2xl bg-teal-100" />
                  <h3 className="text-xl font-bold text-slate-900">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
              Flow
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              安心しながら、
              <span className="text-teal-600">判断を前に進める</span>
              3ステップ
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              気持ちを落ち着かせるだけでなく、次の行動を決めるところまで伴走します。
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl space-y-4">
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
                <p className="mt-4 text-base leading-8 text-teal-50/90">
                  完璧に整理されていなくても大丈夫です。
                  相談を言葉にすると、次の判断に必要な視点が見えやすくなります。
                </p>
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
