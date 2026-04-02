export default function FumufumuLPWorldview() {
  const worldviewPoints = [
    {
      title: "やさしく受け止める",
      text: "強い言葉で切り捨てるのではなく、まず悩みを受け止める。ふむふむは、その空気感から設計する相談の場です。",
    },
    {
      title: "納得できる言葉で返す",
      text: "誰かの成功談を押しつけるのではなく、その人の状況に合った現実的な助言を返す。だから次の一歩が見えやすくなります。",
    },
    {
      title: "安心できる場を守る",
      text: "相談もアドバイスも、安心して読めることが前提。場の空気を守る運営姿勢も、ふむふむの価値のひとつです。",
    },
  ];

  const scenes = [
    "年収を上げたいけれど、転職が正解なのかわからない",
    "技術を深めるべきか、マネジメントに進むべきか迷っている",
    "自社開発・受託・SES、どの環境が自分に合うのか整理したい",
  ];

  const steps = [
    {
      no: "01",
      title: "悩みを言葉にする",
      text: "頭の中でぐるぐるしている不安を、そのまま相談として置いてみる。まずは整理されていなくても大丈夫です。",
    },
    {
      no: "02",
      title: "落ち着いたアドバイスに触れる",
      text: "否定や煽りではなく、状況を踏まえた建設的な言葉が返ってくる。読むだけでも気持ちが整っていきます。",
    },
    {
      no: "03",
      title: "次の一歩を決める",
      text: "全部を一気に決めなくてもいい。今の自分に必要な一歩を見つけることを大切にしています。",
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
    <div className="min-h-screen bg-[#F7F8F6] text-slate-800">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_22%)]" />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-8 lg:pb-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center justify-center">
            <h1 className="mt-8 text-4xl font-black leading-[1.4] tracking-[-0.01em] text-slate-900 md:text-5xl lg:text-6xl">
              自分のもやもやを、
              <br />
              誰かに
              <br />
              <span className="text-teal-600">相談してみませんか？</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              ふむふむは、エンジニアのキャリアの悩みに対して、やさしく、実践的に、納得感のある言葉が返ってくる場を目指しています。
              相談する前からその空気感が伝わることを、大事にしています。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="rounded-2xl bg-[#F5C94A] px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#EAB308]"
              >
                相談してみる
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
              Scene
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              こんな迷いに、静かに寄り添うために。
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              キャリアの悩みは、すぐに答えを出せるものばかりではありません。だからこそ、焦らせるのではなく、整理しながら前に進める場が必要です。
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

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                Worldview
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                ふむふむが伝えたい、3つの空気感
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

        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
              Flow
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              使い方は、とても静かでシンプルです。
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              プロダクトの機能を細かく並べるよりも、使ったときにどんな気持ちで進めるのかを先に共有する構成にしています。
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl space-y-4">
            {steps.map((step) => (
              <div
                key={step.no}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-lg font-black text-white">
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
                  まずは、安心して相談できそうか。
                  <br />
                  そこから始めてください。
                </h2>
                <p className="mt-4 text-base leading-8 text-teal-50/90">
                  ふむふむは、悩みを急かして結論に連れていく場所ではありません。
                  納得できる次の一歩を見つけるための、落ち着いた入口です。
                </p>
                <div className="mt-7 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#F5C94A] px-8 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#EAB308]"
                  >
                    匿名でキャリア相談を投稿する
                  </button>
                  <p className="text-sm text-teal-50/80">
                    登録は1分。まずは今の悩みを言葉にしてみましょう。
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
