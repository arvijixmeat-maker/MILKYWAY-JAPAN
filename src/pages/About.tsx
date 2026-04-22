import React from 'react';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';

// NOTE: Replace these URLs with final brand imagery when available.
// Expected uploads — you can put files in R2 at /images/about/*.jpg and swap these paths.
const IMG = {
    hero: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
    gerNight: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=1600&q=80',
    principle1: 'https://images.unsplash.com/photo-1517582530837-58f055cacd27?w=1200&q=80',
    principle2: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80',
    principle3: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
    bilguun: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    gantuu: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80',
    bolor: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80',
};

export const About: React.FC = () => {
    const structuredData = [
        {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: '会社案内 | Milkyway Japan',
            url: 'https://mongolryokou.com/about',
            inLanguage: 'ja',
            mainEntity: {
                '@type': 'TravelAgency',
                name: 'モンゴリア銀河系',
                alternateName: ['Milkyway Japan', 'モンゴリア天の川'],
                url: 'https://mongolryokou.com',
                logo: 'https://mongolryokou.com/favicon.png',
                founder: [
                    { '@type': 'Person', name: 'Bilguun', jobTitle: '代表' },
                    { '@type': 'Person', name: 'Gantuu', jobTitle: '副代表' },
                ],
                employee: [
                    { '@type': 'Person', name: 'Bolor', jobTitle: '旅行デザイナー' },
                ],
                areaServed: { '@type': 'Country', name: 'モンゴル' },
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'バヤンズル区 13棟 DACOセンター 3階 306号',
                    addressLocality: 'ウランバートル',
                    addressCountry: 'MN',
                },
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
                { '@type': 'ListItem', position: 2, name: '会社案内', item: 'https://mongolryokou.com/about' },
            ],
        },
    ];

    return (
        <>
            <SEO
                title="会社案内"
                description="モンゴル現地の旅行会社「モンゴリア銀河系（天の川）」。韓国でホテル経営学科を卒業し、モンゴルで暮らす代表と副代表が設立した家族経営のモンゴル旅行会社です。現地人ならではの視点と日本人旅行客の情緒に合わせた日程で、リーズナブルな価格でどこにもない旅をお届けします。"
                canonical="/about"
                structuredData={structuredData}
            />

            <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen pb-24 break-keep">
                {/* Hero */}
                <section className="relative w-full aspect-[4/3] sm:aspect-[21/9] overflow-hidden bg-slate-900">
                    <img
                        src={IMG.hero}
                        alt="モンゴリア天の川チームの記念写真"
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 sm:pb-16 text-center px-6">
                        <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-xl max-w-3xl">
                            モンゴル現地の旅行会社
                            <br />
                            <span className="text-teal-300">"モンゴリア天の川"</span>
                        </h1>
                    </div>
                </section>

                {/* Section 1: 旅行理念 */}
                <section className="py-14 sm:py-20 px-6 sm:px-10 max-w-4xl mx-auto">
                    <p className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 mb-2 tracking-wider">
                        モンゴル現地の旅行会社
                    </p>
                    <h2 className="text-2xl sm:text-4xl font-extrabold mb-6 leading-tight">
                        <span className="text-teal-500">#</span>旅行理念は？
                    </h2>
                    <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                        <p>
                            単なる観光ではなく、モンゴルの大自然と全身でコミュニケーションする特別な体験をご提供します。
                        </p>
                        <p>
                            疲れた日常から抜け出し、モンゴルの自然の中で新しい自我を発見できるようにお手伝いします。
                        </p>
                    </div>
                </section>

                {/* Ger Camp night image + overlay quote */}
                <section className="relative w-full aspect-[4/3] sm:aspect-[21/9] overflow-hidden">
                    <img
                        src={IMG.gerNight}
                        alt="モンゴルのゲルキャンプと星空"
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/65" />
                    <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-10">
                        <p className="text-white text-sm sm:text-lg md:text-xl leading-relaxed max-w-3xl text-center drop-shadow-xl">
                            現地人だけが知っている最もモンゴルらしい旅行場所と旅行パッケージと日本人旅行客の情緒に合わせた旅行日程で、どこでもない構成で旅行を提供しています。
                        </p>
                    </div>
                </section>

                {/* Section 2: 旅行の価値観 */}
                <section className="py-14 sm:py-20 px-6 sm:px-10 max-w-4xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                    <div className="order-2 md:order-1 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                        <p>
                            旅行者の安全と利便性を最優先に考え、旅行者の最上の満足度のために最善を尽くして努力します。
                        </p>
                    </div>
                    <div className="order-1 md:order-2">
                        <p className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 mb-2 tracking-wider">
                            モンゴル現地の旅行会社
                        </p>
                        <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                            <span className="text-teal-500">#</span>旅行の価値観は？
                        </h2>
                    </div>
                </section>

                {/* Team members */}
                <section className="px-6 sm:px-10 max-w-4xl mx-auto pb-14 sm:pb-20">
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { name: 'Bilguun', role: '代表', img: IMG.bilguun },
                            { name: 'Gantuu', role: '副代表', img: IMG.gantuu },
                            { name: 'Bolor', role: '旅行デザイナー', img: IMG.bolor },
                        ].map((person) => (
                            <div
                                key={person.name}
                                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg"
                            >
                                <img
                                    src={person.img}
                                    alt={`${person.name} (${person.role})`}
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/90 backdrop-blur-sm text-[10px] sm:text-xs font-bold text-slate-800 px-2 py-0.5 rounded-full">
                                    {person.role}
                                </span>
                                <p className="absolute bottom-3 left-3 right-3 text-white text-base sm:text-xl font-bold drop-shadow-xl">
                                    {person.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Principle 1 */}
                <PrincipleBlock
                    number={1}
                    align="right"
                    heading={<>モンゴル旅行パッケージは<br />モンゴル人が計画しなければ<br />なりません。</>}
                    image={IMG.principle1}
                    imageAlt="モンゴリア天の川チーム"
                    body="うちの旅行社は韓国でホテル経営学科を卒業してモンゴルに住んでいる代表と副代表で構成された家族が設立したモンゴル旅行会社です！現地人だけが知っている最もモンゴルらしい旅行場所と日本人旅行客の情緒に合わせた旅行日程で、どこにもない構成で旅行を計画します。"
                />

                {/* Principle 2 */}
                <PrincipleBlock
                    number={2}
                    align="left"
                    heading={<>リーズナブルな価格が<br />一番重要です。</>}
                    image={IMG.principle2}
                    imageAlt="モンゴル通貨トゥグルグ"
                    imageSide="right"
                    body={
                        <>
                            <p>
                                現地の人だけが運営する旅行会社なので、大手旅行会社の中間流通過程を省略して旅行者の不必要な手数料負担を下げました。
                            </p>
                            <p>
                                旅行は旅行であるだけで、NOショッピング、NOオプション、旅行中に追加で発生するオプション費用はありません。
                            </p>
                        </>
                    }
                />

                {/* Principle 3 */}
                <PrincipleBlock
                    number={3}
                    align="right"
                    heading={<>モンゴル旅行について<br />固定観念を打ち破ります。</>}
                    image={IMG.principle3}
                    imageAlt="モンゴルの宿泊施設"
                    body="遊牧民と馬乗り！伝統家屋ゲル！このすべてを体験しながら、ホカンスまですべて可能です！伝統ゲル体験ときれいでクオリティのある宿泊施設、快適な車と、さっぱりとしておいしい店を中心に旅行することになります！"
                />

                {/* CTA */}
                <section className="py-14 sm:py-20 px-6 sm:px-10 max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                        一緒にモンゴルへ行きませんか？
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6">
                        お気軽にお問い合わせください。
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <a
                            href="/products"
                            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full shadow transition-colors"
                        >
                            ツアー商品を見る
                        </a>
                        <a
                            href="/custom-estimate"
                            className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-teal-500 font-bold rounded-full shadow transition-colors"
                        >
                            オーダーメイド相談
                        </a>
                    </div>
                </section>
            </div>

            <BottomNav />
        </>
    );
};

// ─── Reusable Principle Block ──────────────────────────────────────
interface PrincipleBlockProps {
    number: number;
    align: 'left' | 'right';
    heading: React.ReactNode;
    image: string;
    imageAlt: string;
    imageSide?: 'left' | 'right';  // which column holds the image on md+. default: 'left'
    body: React.ReactNode;
}

const PrincipleBlock: React.FC<PrincipleBlockProps> = ({
    number,
    align,
    heading,
    image,
    imageAlt,
    imageSide = 'left',
    body,
}) => {
    const numPosClass = align === 'right'
        ? 'right-0 sm:right-4'
        : 'left-0 sm:left-4';
    const headingAlignClass = align === 'right' ? 'text-left md:text-left' : 'text-left md:text-right';

    return (
        <section className="py-12 sm:py-16 px-6 sm:px-10 max-w-4xl mx-auto">
            <div className="relative mb-8">
                <span
                    className={`absolute ${numPosClass} -top-6 sm:-top-10 text-teal-200/80 dark:text-teal-500/20 text-[120px] sm:text-[180px] font-black leading-none select-none pointer-events-none`}
                    aria-hidden="true"
                >
                    {number}
                </span>
                <h2 className={`relative text-xl sm:text-3xl font-extrabold leading-tight ${headingAlignClass}`}>
                    {heading}
                </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                <img
                    src={image}
                    alt={imageAlt}
                    loading="lazy"
                    decoding="async"
                    className={`w-full aspect-[4/3] object-cover rounded-2xl shadow ${imageSide === 'right' ? 'md:order-2' : 'md:order-1'}`}
                />
                <div
                    className={`text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 ${imageSide === 'right' ? 'md:order-1' : 'md:order-2'}`}
                >
                    {typeof body === 'string' ? <p>{body}</p> : body}
                </div>
            </div>
        </section>
    );
};
