import { Link, Navigate, useLocation } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

type Landing = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  points: { title: string; body: string }[];
  sections: { title: string; paragraphs: string[] }[];
  faqs: { q: string; a: string }[];
  primary: { label: string; href: string };
};

const SEARCH_LANDINGS: Record<string, Landing> = {
  'mongolia-tour': {
    title: 'モンゴルツアー比較｜現地旅行会社の日本語ガイド付き旅行',
    description: 'モンゴルツアーの選び方を目的・日数・予算別に解説。乗馬、ゴビ砂漠、テレルジ、ゲル宿泊を日本語ガイド付きで手配する現地旅行会社です。',
    eyebrow: 'MONGOLIA TOUR GUIDE',
    intro: '初めてのモンゴル旅行でも迷わないよう、目的、旅行日数、移動距離、宿泊スタイルからツアーを比較できます。既成プランだけでなく、航空便や体力に合わせた日程調整にも対応します。',
    points: [
      { title: '3〜4日', body: 'テレルジ、ゲル宿泊、短時間の乗馬体験を中心にした初回向けプラン。' },
      { title: '5〜7日', body: '草原滞在と乗馬、地方観光を組み合わせやすい標準的な日数。' },
      { title: '8日以上', body: '南ゴビやフブスグルなど、長距離移動を含む周遊旅行におすすめ。' },
    ],
    sections: [
      { title: 'モンゴルツアーを選ぶ3つの基準', paragraphs: ['最初に決めたいのは「草原と乗馬」「ゴビ砂漠」「遊牧文化」「星空」のどれを優先するかです。すべてを短期間に詰め込むと車移動が長くなるため、4日以内ならウランバートル近郊、5日以上なら地方周遊を組み合わせると無理がありません。', '料金を見るときは、宿泊、食事、専用車、日本語ガイド、入場料が含まれているかを確認してください。表示価格だけでなく、現地で追加になる費用まで比較することが大切です。'] },
      { title: '日本語ガイド付き現地ツアーの安心', paragraphs: ['空港到着後の送迎から宿泊、地方移動まで一つの窓口で確認できます。食事制限、乗馬経験、子ども連れ、記念旅行なども予約前に共有いただければ、現地事情に合わせて調整します。'] },
    ],
    faqs: [
      { q: 'モンゴルツアーは何日必要ですか？', a: '初めてなら3泊4日から楽しめます。南ゴビや複数地域を巡る場合は、移動時間を考えて6日以上がおすすめです。' },
      { q: '一人でも参加できますか？', a: '一人旅にも対応できます。専用車やガイド費用の違いがあるため、希望日と予算をもとに個別にご案内します。' },
      { q: '航空券は料金に含まれますか？', a: '商品ごとに条件が異なります。各商品ページの含まれるもの・含まれないものをご確認ください。' },
    ],
    primary: { label: 'モンゴルツアー商品を見る', href: '/products' },
  },
  'mongolia-horse-riding-tour': {
    title: 'モンゴル乗馬ツアー｜初心者から経験者まで日本語ガイド同行',
    description: 'モンゴル乗馬ツアーを初心者・経験者別に選ぶポイント、服装、時期、旅行日数を解説。大草原での乗馬旅行を日本語でサポートします。',
    eyebrow: 'HORSE RIDING IN MONGOLIA',
    intro: 'モンゴルの大草原で乗馬を楽しむ旅行を、初めて馬に乗る方から長距離騎乗を希望する経験者まで、体力と経験に合わせてご案内します。',
    points: [
      { title: '初心者', body: '乗り方の説明と短時間の常歩から開始。無理のない距離で草原を体験します。' },
      { title: '経験者', body: '騎乗経験を確認し、距離やペースを相談して行程を組み立てます。' },
      { title: '準備', body: '長ズボン、滑りにくい靴、防風着、日焼け対策が基本です。' },
    ],
    sections: [
      { title: '初心者が確認したいこと', paragraphs: ['「乗馬体験」と「乗馬トレッキング」では騎乗時間も負担も異なります。初めての方は短時間から始め、翌日の疲労も考えて連続騎乗を詰め込みすぎない日程がおすすめです。', '現地では天候が変わりやすいため、防風・防寒の重ね着を準備してください。ヘルメットなどの装備条件はツアーごとに予約前に確認します。'] },
      { title: 'ベストシーズンと滞在日数', paragraphs: ['一般的に草原が緑になる初夏から夏は人気があります。一方、混雑や気温だけでなく、希望する騎乗時間と訪問地域を基準に選ぶことが重要です。3泊4日なら短時間体験、5日以上なら草原滞在を含む乗馬中心の行程を組みやすくなります。'] },
    ],
    faqs: [
      { q: '乗馬未経験でも参加できますか？', a: '初心者向けプランを選べば参加できます。年齢、体力、不安な点を予約前にお知らせください。' },
      { q: '子どもも乗馬できますか？', a: '年齢や体格、現地の馬と安全装備によって判断します。予約前にお子さまの年齢と身長をご相談ください。' },
      { q: '雨天でも乗馬しますか？', a: '天候と安全状況を現地で確認し、時間変更や代替日程をご案内する場合があります。' },
    ],
    primary: { label: '乗馬ツアーを探す', href: '/category/horse-riding-tour' },
  },
  'gobi-desert-tour': {
    title: 'モンゴル・ゴビ砂漠ツアー｜日数・見どころ・移動を解説',
    description: '南ゴビの砂丘、渓谷、恐竜化石で知られる地域を巡るゴビ砂漠ツアー。必要日数、長距離移動、宿泊、持ち物を日本語でご案内します。',
    eyebrow: 'GOBI DESERT TOUR',
    intro: 'ゴビ旅行では砂丘だけでなく、広大な荒野、渓谷、遊牧民の暮らしなど異なる景観を巡ります。距離が長いため、見どころの数より移動に余裕のある日程が満足度を左右します。',
    points: [
      { title: '必要日数', body: '主要スポットを巡るなら、国内線利用を含めても余裕のある日程がおすすめ。' },
      { title: '移動', body: '未舗装路を長時間走る日があります。休憩を含む現実的な行程を確認します。' },
      { title: '宿泊', body: 'ゲルキャンプや地方宿泊の設備条件は、商品ごとに事前確認が必要です。' },
    ],
    sections: [
      { title: 'ゴビ砂漠ツアーの日程設計', paragraphs: ['ウランバートルから南ゴビまでは距離があり、陸路と国内線で旅の組み方が変わります。短期間に多くの場所を入れるより、ホンゴル砂丘など優先したい場所を決め、天候や道路状況に対応できる余白を残してください。', '砂漠という名前でも朝晩は冷えることがあります。季節に合わせた防寒着、乾燥対策、日差し対策を準備すると安心です。'] },
      { title: '料金比較で見るべき項目', paragraphs: ['専用車、ドライバー、ガイド、食事、宿泊、入場料、国内線の有無を確認します。同じ日数でも走行距離や宿泊水準によって料金が変わるため、総額と行程を一緒に比較してください。'] },
    ],
    faqs: [
      { q: 'ゴビ砂漠は何泊あれば行けますか？', a: '訪問場所と移動手段によります。主要地域を急がず巡るなら、ゴビ地域だけで複数泊を確保することをおすすめします。' },
      { q: 'ゴビ砂漠でも日本語ガイドが同行しますか？', a: '日本語ガイド同行の商品を選択できます。対応条件は各商品ページまたは見積もり時にご確認ください。' },
      { q: '車酔いが心配です', a: '未舗装路の移動があるため、事前にお知らせください。休憩を取りやすい行程を相談できます。' },
    ],
    primary: { label: 'ゴビ砂漠ツアーを見る', href: '/category/gobi-desert' },
  },
  'mongolia-travel-cost': {
    title: 'モンゴル旅行の費用とベストシーズン｜予算・日数の目安',
    description: 'モンゴル旅行の費用を航空券、現地ツアー、宿泊、食事に分けて考える方法と、目的別のベストシーズン、必要日数を解説します。',
    eyebrow: 'TRAVEL COST & SEASON',
    intro: 'モンゴル旅行の総予算は、航空券の時期、人数、地方への移動距離、ガイドと専用車、宿泊水準によって変わります。安さだけでなく、含まれるサービスと移動時間を揃えて比較しましょう。',
    points: [
      { title: '航空券', body: '出発地、直行便・経由便、繁忙期で大きく変動します。早めの確認が安心です。' },
      { title: '現地費用', body: '専用車とガイドは人数で一人あたり負担が変わります。含有項目を比較します。' },
      { title: '季節', body: '草原、乗馬、星空、冬景色など、目的によって適した時期が異なります。' },
    ],
    sections: [
      { title: '費用を正しく比較する方法', paragraphs: ['見積もりでは、空港送迎、宿泊、毎日の食事、専用車、日本語ガイド、観光地の入場料、乗馬などの体験費用を分けて確認します。地方旅行では車両と燃料、ドライバーの宿泊も価格に影響します。', '最安値だけを比べると、現地で食事や移動費が追加になることがあります。同じ人数、日数、含有条件で総額を比較してください。'] },
      { title: '目的別のベストシーズン', paragraphs: ['緑の草原と過ごしやすさを重視する旅行、星空や写真を目的にする旅行、冬の景色を体験する旅行では適した服装と行程が異なります。旅行月が決まっている場合は、その時期に無理のない地域から選ぶ方法もおすすめです。'] },
    ],
    faqs: [
      { q: 'モンゴル旅行はいくら必要ですか？', a: '航空券、人数、日数、移動地域で大きく変わります。希望条件を揃えた総額見積もりで比較するのが確実です。' },
      { q: 'モンゴル旅行のベストシーズンはいつですか？', a: '草原や乗馬を重視する場合は一般に初夏から夏が人気ですが、目的と地域によって最適な時期は変わります。' },
      { q: '安くする方法はありますか？', a: '複数人で専用車費用を分ける、訪問地域を絞る、繁忙期を避ける方法があります。安全や移動時間を削りすぎないことも重要です。' },
    ],
    primary: { label: '無料で見積もりを相談する', href: '/custom-estimate' },
  },
};

export function SearchLandingPage() {
  const slug = useLocation().pathname.replace(/^\//, '').replace(/\/$/, '');
  const page = SEARCH_LANDINGS[slug];
  if (!page) return <Navigate to="/404" replace />;

  const canonical = `/${slug}`;
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
      { '@type': 'ListItem', position: 2, name: page.title.split('｜')[0], item: `https://mongolryokou.com${canonical}` },
    ],
  };

  return <>
    <SEO title={page.title} description={page.description} canonical={canonical} structuredData={[faqSchema, breadcrumb]} />
    <main className="bg-white text-slate-900">
      <section className="bg-slate-950 px-5 py-16 text-white md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-teal-300">{page.eyebrow}</p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight md:text-5xl">{page.title.split('｜')[0]}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">{page.intro}</p>
          <Link to={page.primary.href} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-teal-500 px-6 font-bold text-slate-950 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-white">{page.primary.label}</Link>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <section aria-label="旅行計画の要点" className="grid gap-4 md:grid-cols-3">
          {page.points.map((point) => <article key={point.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><h2 className="text-lg font-bold">{point.title}</h2><p className="mt-3 leading-7 text-slate-600">{point.body}</p></article>)}
        </section>
        {page.sections.map((section) => <section key={section.title} className="border-b border-slate-200 py-12"><h2 className="text-2xl font-bold md:text-3xl">{section.title}</h2><div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-slate-700">{section.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></section>)}
        <section className="py-12"><h2 className="text-2xl font-bold md:text-3xl">よくある質問</h2><div className="mt-6 space-y-3">{page.faqs.map((faq) => <details key={faq.q} className="rounded-xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{faq.q}</summary><p className="mt-3 leading-7 text-slate-600">{faq.a}</p></details>)}</div></section>
        <nav aria-label="関連するモンゴル旅行情報" className="rounded-2xl bg-slate-100 p-6 md:p-8"><h2 className="text-xl font-bold">目的に合わせて詳しく見る</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(SEARCH_LANDINGS).filter(([key]) => key !== slug).map(([key, item]) => <Link key={key} to={`/${key}`} className="rounded-xl bg-white p-4 font-semibold text-slate-800 hover:text-teal-700">{item.title.split('｜')[0]} →</Link>)}<Link to="/travel-guide" className="rounded-xl bg-white p-4 font-semibold text-slate-800 hover:text-teal-700">モンゴル旅行ガイド →</Link><Link to="/reviews" className="rounded-xl bg-white p-4 font-semibold text-slate-800 hover:text-teal-700">お客様の旅行レビュー →</Link></div></nav>
      </div>
    </main>
  </>;
}
