import React from 'react';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';
import { getOptimizedImageUrl } from '../utils/cloudflareImage';

// Single marketing image containing the full company introduction layout.
// Save file to: public/assets/about/detail.jpg
const DETAIL_IMAGE = '/assets/about/detail.jpg';

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
                image={DETAIL_IMAGE}
                structuredData={structuredData}
            />

            <main className="bg-background-light dark:bg-background-dark min-h-screen pb-24 break-keep">
                {/* SEO-friendly content mirroring the image (visually hidden, accessible to crawlers & screen readers). */}
                <div className="sr-only">
                    <h1>モンゴル現地の旅行会社「モンゴリア銀河系（天の川）」</h1>

                    <h2>#旅行理念は？</h2>
                    <p>単なる観光ではなく、モンゴルの大自然と全身でコミュニケーションする特別な体験をご提供します。</p>
                    <p>疲れた日常から抜け出し、モンゴルの自然の中で新しい自我を発見できるようにお手伝いします。</p>
                    <p>
                        現地人だけが知っている最もモンゴルらしい旅行場所と旅行パッケージと日本人旅行客の情緒に合わせた旅行日程で、どこでもない構成で旅行を提供しています。
                    </p>

                    <h2>#旅行の価値観は？</h2>
                    <p>旅行者の安全と利便性を最優先に考え、旅行者の最上の満足度のために最善を尽くして努力します。</p>

                    <h2>チーム</h2>
                    <ul>
                        <li>Bilguun - 代表</li>
                        <li>Gantuu - 副代表</li>
                        <li>Bolor - 旅行デザイナー</li>
                    </ul>

                    <h2>1. モンゴル旅行パッケージはモンゴル人が計画しなければなりません。</h2>
                    <p>
                        うちの旅行社は韓国でホテル経営学科を卒業してモンゴルに住んでいる代表と副代表で構成された家族が設立したモンゴル旅行会社です。現地人だけが知っている最もモンゴルらしい旅行場所と日本人旅行客の情緒に合わせた旅行日程で、どこにもない構成で旅行を計画します。
                    </p>

                    <h2>2. リーズナブルな価格が一番重要です。</h2>
                    <p>
                        現地の人だけが運営する旅行会社なので、大手旅行会社の中間流通過程を省略して旅行者の不必要な手数料負担を下げました。旅行は旅行であるだけで、NOショッピング、NOオプション、旅行中に追加で発生するオプション費用はありません。
                    </p>

                    <h2>3. モンゴル旅行について固定観念を打ち破ります。</h2>
                    <p>
                        遊牧民と馬乗り、伝統家屋ゲル、このすべてを体験しながらホカンスまですべて可能です。伝統ゲル体験ときれいでクオリティのある宿泊施設、快適な車と、さっぱりとしておいしい店を中心に旅行することになります。
                    </p>
                </div>

                {/* Visual: the full-length company intro design */}
                <img
                    src={getOptimizedImageUrl(DETAIL_IMAGE, 'productDetailFull')}
                    alt="モンゴル現地の旅行会社「モンゴリア銀河系（天の川）」の会社案内"
                    fetchPriority="high"
                    decoding="async"
                    className="block w-full h-auto mx-auto max-w-2xl"
                />

                {/* CTA */}
                <section className="py-12 sm:py-16 px-6 max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white">
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
            </main>

            <BottomNav />
        </>
    );
};
