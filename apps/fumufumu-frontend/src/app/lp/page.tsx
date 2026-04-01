import Link from "next/link";
import "./styles.css";

const steps = [
  {
    title: "悩みを言葉にする",
    body: "まとまっていなくても大丈夫。今の気持ちをそのまま相談できます。",
  },
  {
    title: "ふむふむと受け止める",
    body: "すぐに否定されず、まずは状況を丁寧に理解する姿勢を大切にしています。",
  },
  {
    title: "次の一歩が見える",
    body: "寄り添うだけで終わらず、行動につながる実践的なアドバイスを届けます。",
  },
] as const;

const faqs = [
  {
    q: "匿名で相談できますか？",
    a: "はい。個人を特定しない形で投稿できる設計を前提にしています。",
  },
  {
    q: "相談内容はすぐ公開されますか？",
    a: "運営の投稿チェックを通して、安心して使える環境づくりを行っています。",
  },
  {
    q: "どんな相談でも大丈夫ですか？",
    a: "日々の悩み、キャリア、人間関係など、ひとりで抱えがちなテーマに対応しています。",
  },
  {
    q: "アドバイスは具体的ですか？",
    a: "気持ちへの共感だけでなく、次の行動につながる提案を重視しています。",
  },
  {
    q: "料金はかかりますか？",
    a: "現在は無料で始められる形を基本にしています。",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="lp-root">
      <div className="lp-glow lp-glow-left" aria-hidden="true" />
      <div className="lp-glow lp-glow-right" aria-hidden="true" />

      <section className="lp-hero">
        <p className="lp-badge">安心して相談できる場所</p>
        <h1 className="lp-title">
          ひとりで抱えない。
          <br />
          匿名で、安心して相談できる。
        </h1>
        <p className="lp-lead">
          fumufumuは、ひとりで抱えた悩みに寄り添い、
          <strong>「ふむふむ」と納得して次のアクションへ進める</strong>
          実践的なアドバイスを得られる場所です。
        </p>
        <div className="lp-cta-wrap">
          <Link href="/signup" className="lp-cta">
            無料で始める
          </Link>
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-section-title">fumufumuでできること</h2>
        <div className="lp-grid">
          {steps.map((step, i) => (
            <article className="lp-card" key={step.title}>
              <p className="lp-card-index">0{i + 1}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-section-soft">
        <h2 className="lp-section-title">よくある質問</h2>
        <div className="lp-faqs">
          {faqs.map((faq) => (
            <article key={faq.q} className="lp-faq-item">
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-final-cta">
        <h2>まずは、ひとつ相談してみませんか？</h2>
        <p>言葉にするだけでも、気持ちは少し軽くなります。</p>
        <Link href="/signup" className="lp-cta">
          無料で始める
        </Link>
      </section>
    </main>
  );
}
