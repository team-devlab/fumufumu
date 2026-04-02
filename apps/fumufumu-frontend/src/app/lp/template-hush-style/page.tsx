import Link from "next/link";

const notes = [
  {
    title: "Designer",
    text: "相談前の不安を先に解消する短文を置く。安心要素はCTAの近くに集約する。",
    code: "投稿は公開前に運営が確認します",
    className: "lg:-left-10 lg:top-28",
  },
  {
    title: "Designer",
    text: "FVは機能説明より感情優先。最初の一行で「自分ごと」になる言葉を使う。",
    code: "そのもやもや、ひとりで抱えず相談してみませんか？",
    className: "lg:-right-10 lg:top-56",
  },
  {
    title: "Designer",
    text: "ボタン文言は1アクションに統一。迷わせない導線を維持する。",
    code: "相談してみる",
    className: "lg:left-8 lg:bottom-24",
  },
] as const;

const flowSteps = [
  {
    no: "01",
    title: "迷いをそのまま書き出す",
    text: "頭の中で散らばった迷いを、匿名でそのまま言葉にする。整理されていなくても、悩みの骨格が見えてきます。",
  },
  {
    no: "02",
    title: "経験と助言を読み比べる",
    text: "似た状況の投稿と回答を読み比べながら、ひとつの見方に偏らず判断材料を増やせます。",
  },
  {
    no: "03",
    title: "次の判断をひとつ決める",
    text: "公開前の投稿確認で場の安心感を保ちながら、いまの自分に必要な行動をひとつ決められます。",
  },
] as const;

export default function TemplateHushStylePage() {
  return (
    <main className="min-h-screen bg-[#EEF2F4] text-[#0F1B3D]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(242,200,75,0.18),transparent_42%),radial-gradient(circle_at_12%_8%,rgba(15,154,141,0.12),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(15,27,61,0.08),transparent_34%),linear-gradient(180deg,#F5F7F8_0%,#EDF2F4_62%,#E8EEF1_100%)]"
        aria-hidden="true"
      />

      <section className="mx-auto max-w-[1280px] px-5 pb-12 pt-12 lg:px-8 lg:pb-16 lg:pt-16">
        <p className="text-center text-xs font-bold tracking-[0.24em] text-[#0F9A8D]">
          FUMUFUMU / WORLDVIEW
        </p>

        <div className="relative mt-6 rounded-[28px] border border-[#CFD9E2] bg-[#F8FBFD] p-3 shadow-[0_22px_54px_rgba(15,27,61,0.12)] lg:p-4">
          <div className="rounded-[22px] border border-[#D7E0E8] bg-[#EEF3F8] p-4 lg:p-6">
            <div className="mb-6 flex items-center gap-3 rounded-full border border-[#CED9E4] bg-[#DFE8F1] px-4 py-3 text-xs text-[#5A6D8A]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FB7185]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F2C84B]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#60A5FA]" />
              </div>
              <span className="ml-3">app.fumufumu.jp</span>
            </div>

            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-black leading-[1.2] tracking-[-0.02em] text-[#0F1B3D] md:text-5xl lg:text-6xl">
                そのもやもや、
                <br />
                <span className="text-[#0F9A8D]">ひとりで抱えず</span>
                <br />
                相談してみませんか？
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#4B607F] md:text-base md:leading-8">
                ふむふむは、悩みを言葉にするところから次の一歩までを、
                やさしくつなぐキャリア相談サービスです。
              </p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F2C84B] px-8 py-3.5 text-base font-bold text-[#0F1B3D] shadow-[0_10px_24px_rgba(242,200,75,0.28)] transition hover:-translate-y-0.5 hover:bg-[#EAB308]"
                >
                  相談してみる
                </Link>
                <p className="text-sm text-[#5A6D8A]">
                  匿名で投稿でき、公開前には運営が確認します
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#CDD9E5] bg-gradient-to-br from-[#EDF2F8] to-[#E3EBF4] p-4">
                <div className="h-28 rounded-xl border border-[#0F9A8D]/35 bg-[radial-gradient(circle_at_20%_20%,rgba(15,154,141,0.16),transparent_52%),linear-gradient(135deg,#EDF3F8,#E3EBF4)]" />
                <p className="mt-3 text-xs text-[#4B607F]">
                  投稿作成画面（Web）
                </p>
              </div>
              <div className="rounded-2xl border border-[#CDD9E5] bg-gradient-to-br from-[#EDF2F8] to-[#E3EBF4] p-4">
                <div className="h-28 rounded-xl border border-[#F2C84B]/42 bg-[radial-gradient(circle_at_75%_20%,rgba(242,200,75,0.16),transparent_52%),linear-gradient(135deg,#EDF3F8,#E3EBF4)]" />
                <p className="mt-3 text-xs text-[#4B607F]">
                  回答閲覧画面（Web）
                </p>
              </div>
              <div className="rounded-2xl border border-[#CDD9E5] bg-gradient-to-br from-[#EDF2F8] to-[#E3EBF4] p-4">
                <div className="h-28 rounded-xl border border-[#5B78A7]/35 bg-[radial-gradient(circle_at_50%_35%,rgba(91,120,167,0.16),transparent_52%),linear-gradient(135deg,#EDF3F8,#E3EBF4)]" />
                <p className="mt-3 text-xs text-[#4B607F]">
                  安心設計の説明（Web）
                </p>
              </div>
            </div>
          </div>

          {notes.map((note) => (
            <aside
              key={note.code}
              className={`mt-4 rounded-2xl border border-[#D8A92C] bg-[#F2C84B] p-4 text-[#0F1B3D] shadow-[0_16px_34px_rgba(242,200,75,0.34)] lg:absolute lg:mt-0 lg:w-[300px] ${note.className}`}
            >
              <p className="text-xs font-semibold text-[#67520C]">
                {note.title}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#0F1B3D]">
                {note.text}
              </p>
              <p className="mt-3 rounded-lg bg-[#F8DE8A] px-3 py-2 text-xs font-semibold text-[#0F1B3D]">
                {note.code}
              </p>
            </aside>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-16 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0F9A8D]">
            Flow
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0F1B3D] md:text-5xl md:leading-[1.15] lg:whitespace-nowrap">
            安心しながら、
            <span className="text-[#0F9A8D]">判断を前に進める</span>
            3ステップ
          </h2>
          <p className="mt-4 text-base leading-8 text-[#4B607F]">
            気持ちを落ち着かせるだけでなく、次の行動を決めるところまで伴走します。
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl space-y-4">
          {flowSteps.map((step) => (
            <article
              key={step.no}
              className="rounded-3xl border border-[#CFD9E2] bg-[#F7FAFC] px-5 py-4 shadow-sm md:px-7 md:py-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F9A8D] text-base font-black text-white">
                  {step.no}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.01em] text-[#0F1B3D] md:text-[30px]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#4B607F]">
                    {step.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-6xl">
          <div className="rounded-[34px] bg-gradient-to-r from-[#0F9A8D] to-[#10B981] px-8 py-12 text-white shadow-[0_20px_58px_rgba(16,185,129,0.25)] lg:px-12 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-3xl font-black leading-tight md:text-5xl">
                まずは、いま気になっていることを
                <br />
                ひとつだけ書いてみる。
              </h3>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-teal-50/95">
                完璧に整理されていなくても大丈夫です。相談を言葉にすると、次の判断に必要な視点が見えやすくなります。
              </p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F2C84B] px-8 py-4 text-base font-bold text-[#0F1B3D] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-lg"
                >
                  相談してみる
                </Link>
                <p className="text-sm text-teal-50/85">
                  登録は1分。匿名で投稿でき、公開前には運営が確認します。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
