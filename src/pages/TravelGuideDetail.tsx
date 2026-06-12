import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../lib/api';
import { BottomNav } from '../components/layout/BottomNav';
import { SEO } from '../components/seo/SEO';
import { SimpleSlider } from '../components/ui/SimpleSlider';
import { LocationCard } from '../components/magazine/LocationCard';
import type { LocationInfo } from '../components/magazine/LocationCard';
import { RelatedTours } from '../components/magazine/RelatedTours';
import { useTranslation } from 'react-i18next';

interface Magazine {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    image: string;
    tag?: string;
    author?: string;
    authorImage?: string;
    createdAt: string;
    updatedAt?: string;
}

interface MagazineFaq {
    question: string;
    answer: string;
}

const buildMagazineFaqs = (magazine: Magazine): MagazineFaq[] => [
    {
        question: `${magazine.title}を旅行計画に取り入れる際のポイントは？`,
        answer: `季節、移動時間、滞在日数によって最適な組み方が変わります。この記事の内容を参考にしながら、${magazine.category || 'モンゴル旅行'}の行程に無理のない余白を持たせることをおすすめします。`,
    },
    {
        question: '初めてのモンゴル旅行でも参加できますか？',
        answer: 'はい。日本語での事前案内と現地サポートがあるツアーを選ぶと安心です。体力やご希望に合わせて、移動距離や体験内容を調整できます。',
    },
    {
        question: '服装や持ち物はどのように準備すればよいですか？',
        answer: 'モンゴルは一日の寒暖差が大きいため、重ね着できる服、防風・防寒着、歩きやすい靴をご用意ください。季節と訪問地域に応じた詳細は出発前にご案内します。',
    },
    {
        question: 'この記事に関連するツアーの相談や見積もりはできますか？',
        answer: 'はい。人数、旅行日程、興味のある体験をお知らせいただければ、既存ツアーの調整やオーダーメイドの日程をご提案します。',
    },
];

export const TravelGuideDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [relatedMagazines, setRelatedMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMagazine = async () => {
            if (!id) return;
            setLoading(true);

            try {
                // 1. Fetch current magazine
                const magData = await api.magazines.get(id);

                if (!magData) {
                    console.error('Magazine not found');
                    setLoading(false);
                    return;
                }

                const currentMagazine: Magazine = {
                    id: magData.id,
                    title: magData.title,
                    description: magData.subtitle || magData.description || '',
                    content: magData.content,
                    category: magData.category,
                    image: magData.thumbnail || magData.image || '',
                    tag: magData.tag,
                    author: magData.author,
                    authorImage: magData.author_image || magData.authorImage,
                    createdAt: magData.created_at,
                    updatedAt: magData.updated_at,
                };
                setMagazine(currentMagazine);

                // 2. Fetch related magazines
                // API doesn't have a direct filtering endpoint for this, so we fetch all and filter client-side
                // In a production environment with many items, a specific endpoint would be better.
                const allMagazines = await api.magazines.list();
                if (Array.isArray(allMagazines)) {
                    const relatedData = allMagazines
                        .filter((m: any) =>
                            m.category === magData.category &&
                            m.id !== id &&
                            (m.is_active ?? true)
                        )
                        .slice(0, 3);

                    setRelatedMagazines(relatedData.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        description: m.subtitle || m.description || '',
                        content: m.content,
                        category: m.category,
                        image: m.thumbnail || m.image || '',
                        tag: m.tag,
                        createdAt: m.created_at
                    })));
                }
            } catch (error) {
                console.error('Error fetching magazine details:', error);
            }
            setLoading(false);
        };

        fetchMagazine();
    }, [id]);

    // Content Renderer
    const renderContent = (content: string) => {
        if (!content) {
            return (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                    <span className="material-symbols-outlined text-4xl text-gray-300">article</span>
                    <p className="mt-3 font-bold text-gray-700 dark:text-gray-200">記事を準備中です</p>
                    <p className="mt-1 text-sm text-gray-500">公開までしばらくお待ちください。</p>
                </div>
            );
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        doc.querySelectorAll('img').forEach((image, imageIndex) => {
            const currentAlt = image.getAttribute('alt')?.trim() || '';
            const isGenericAlt = /^(image|img|photo|picture|slide|画像|写真)\s*\d*$/i.test(currentAlt);
            if (!currentAlt || isGenericAlt || /[가-힣]/.test(currentAlt)) {
                image.setAttribute(
                    'alt',
                    `${magazine?.title || 'モンゴル旅行'} 写真${imageIndex + 1}｜モンゴル旅行ガイド`,
                );
            }
            image.setAttribute('loading', 'lazy');
            image.setAttribute('decoding', 'async');
        });
        const childNodes = Array.from(doc.body.childNodes);

        const result: React.ReactNode[] = [];
        let htmlBuffer = '';

        const flushBuffer = (key: string) => {
            if (htmlBuffer) {
                result.push(<div key={key} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlBuffer) }} />);
                htmlBuffer = '';
            }
        };

        childNodes.forEach((node, index) => {
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains('magazine-slider')) {
                flushBuffer(`html-${index}`);

                // Render Slider
                const imagesStr = (node as Element).getAttribute('data-images');
                if (imagesStr) {
                    const images = imagesStr.split(',');
                    result.push(
                        <SimpleSlider
                            key={`slider-${index}`}
                            images={images}
                            altPrefix={magazine?.title}
                        />
                    );
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains('magazine-location')) {
                flushBuffer(`html-${index}`);

                // Render inline LocationCard
                const payload = (node as Element).getAttribute('data-payload');
                if (payload) {
                    try {
                        const data = JSON.parse(decodeURIComponent(payload));
                        const loc: LocationInfo = {
                            name: data.name || undefined,
                            address: data.address || undefined,
                            phone: data.phone || undefined,
                            website: data.website || undefined,
                            hours: data.hours || undefined,
                            mapEmbedUrl: data.mapEmbedUrl || undefined,
                            mapQuery: data.mapQuery || undefined,
                        };
                        result.push(<LocationCard key={`location-${index}`} location={loc} />);
                    } catch {
                        // Malformed payload — skip silently
                    }
                }
            } else {
                // Aggressive Zombie Cleanup:
                // Check if this node is the editor visual representation (thumbnails) but missing the class
                const element = node as Element;
                if (node.nodeType === Node.ELEMENT_NODE &&
                    element.tagName === 'DIV' &&
                    element.textContent &&
                    element.textContent.includes('イメージスライダー') ||
                    element.textContent.includes('이미지 슬라이더') &&
                    element.querySelector('img')) {
                    // This is likely a zombie thumbnail artifact. Skip it.
                    return;
                }

                // Accumulate HTML
                if (node.nodeType === Node.ELEMENT_NODE) {
                    htmlBuffer += (node as Element).outerHTML;
                } else if (node.nodeType === Node.TEXT_NODE) {
                    htmlBuffer += node.textContent || '';
                }
            }
        });

        // Flush remaining buffer
        if (htmlBuffer) {
            result.push(<div key="html-end" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlBuffer) }} />);
        }

        return <>{result}</>;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!magazine) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-500 mb-4">{t('travel_guide.detail.loading_or_not_found')}</p>
                    <button
                        onClick={() => navigate('/travel-guide')}
                        className="text-primary font-bold hover:underline"
                    >
                        {t('travel_guide.detail.go_back_to_list')}
                    </button>
                </div>
            </div>
        );
    }

    // ─── SEO: Article JSON-LD (BlogPosting) + BreadcrumbList ───────────
    const canonicalPath = `/travel-guide/${id}`;
    const absoluteUrl = `https://mongolryokou.com${canonicalPath}`;
    const absoluteImage = magazine.image
        ? (magazine.image.startsWith('http') ? magazine.image : `https://mongolryokou.com${magazine.image}`)
        : 'https://mongolryokou.com/favicon.png';
    const authorName = magazine.author?.trim() || 'モンゴル銀河旅行社 編集部';

    const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: magazine.title,
        description: magazine.description,
        image: [absoluteImage],
        datePublished: magazine.createdAt,
        dateModified: magazine.updatedAt || magazine.createdAt,
        author: {
            '@type': magazine.author ? 'Person' : 'Organization',
            name: authorName,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Milkyway Japan',
            logo: {
                '@type': 'ImageObject',
                url: 'https://mongolryokou.com/favicon.png',
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': absoluteUrl,
        },
        articleSection: magazine.category || undefined,
        keywords: [magazine.category, magazine.tag].filter(Boolean).join(', ') || undefined,
        inLanguage: 'ja',
    };

    const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
            { '@type': 'ListItem', position: 2, name: '旅行ガイド', item: 'https://mongolryokou.com/travel-guide' },
            { '@type': 'ListItem', position: 3, name: magazine.title, item: absoluteUrl },
        ],
    };
    const magazineFaqs = buildMagazineFaqs(magazine);
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: magazineFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
    return (
        <div className="bg-white dark:bg-slate-900 min-h-screen pb-24 font-display overflow-x-hidden">
            <SEO
                title={magazine.title}
                description={magazine.description}
                image={magazine.image}
                keywords={`${magazine.category}, ${magazine.tag || ''}`}
                canonical={canonicalPath}
                structuredData={[articleLd, breadcrumbLd, faqLd]}
            />
            {/* Header Image */}
            <div className="relative h-[240px] md:h-[360px]">
                {magazine.image ? (
                    <img
                        src={magazine.image}
                        alt={`${magazine.title}｜モンゴル旅行ガイド`}
                        className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-slate-400">image</span>
                    </div>
                )}

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>

                {/* Mint Brand Gradient at Bottom */}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0f766e]/90 via-[#0f766e]/35 to-transparent"></div>
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="bg-white text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm">
                            {magazine.category}
                        </span>
                        {magazine.tag && (
                            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white border border-white/30">
                                {magazine.tag}
                            </span>
                        )}
                    </div>
                    <h1 className="text-[19px] md:text-2xl font-bold leading-tight mb-1.5 drop-shadow-sm line-clamp-3">
                        {magazine.title}
                    </h1>
                    <div className="text-white/80 text-[12px] md:text-sm font-medium flex items-center gap-2">
                        <span>{new Date(magazine.createdAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="max-w-3xl mx-auto px-5 py-6 md:py-8">
                {/* Intro/Description */}
                {/* Intro/Description - Removed to prevent duplicate title display as per feedback */}
                {/* {magazine.description && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl mb-8 border-l-4 border-primary">
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {magazine.description}
                        </p>
                    </div>
                )} */}

                {/* Main Content */}
                <div className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-img:rounded-2xl">
                    {renderContent(magazine.content || '')}
                </div>

                <aside className="mt-12 flex items-center gap-4 rounded-xl border border-teal-100 bg-teal-50/70 p-5 dark:border-teal-900/60 dark:bg-teal-950/20">
                    {magazine.authorImage ? (
                        <img
                            src={magazine.authorImage}
                            alt={`${authorName}｜モンゴル旅行記事の著者`}
                            className="h-16 w-16 flex-none rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div
                            className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-primary text-xl font-bold text-white"
                            aria-hidden="true"
                        >
                            {authorName.slice(0, 1)}
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-bold text-primary">この記事の執筆・監修</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{authorName}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            モンゴル現地の旅行情報とツアー運営経験に基づき、旅行前に役立つ情報を確認してお届けします。
                        </p>
                    </div>
                </aside>

                {/* Related Tours (auto-matched by magazine category/tag) */}
                <RelatedTours
                    category={magazine.category}
                    tag={magazine.tag}
                    title={magazine.title}
                    description={`${magazine.description} ${magazine.content.replace(/<[^>]+>/g, ' ').slice(0, 500)}`}
                />

                <section className="mt-16 border-t border-slate-200 pt-8 dark:border-slate-800" aria-labelledby="magazine-faq-heading">
                    <h2 id="magazine-faq-heading" className="text-xl font-bold text-slate-900 dark:text-white">
                        よくある質問
                    </h2>
                    <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                        {magazineFaqs.map((faq) => (
                            <details key={faq.question} className="group py-4">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 dark:text-white">
                                    <span>{faq.question}</span>
                                    <span className="material-symbols-outlined text-primary transition-transform group-open:rotate-180">
                                        expand_more
                                    </span>
                                </summary>
                                <p className="mt-3 pr-9 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                    {faq.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* Related Magazines */}
                {relatedMagazines && relatedMagazines.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-text-primary dark:text-white mb-6">
                            {t('travel_guide.detail.recommended_guides')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedMagazines.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        navigate(`/travel-guide/${item.id}`);
                                        window.scrollTo(0, 0); // Scroll to top on navigation
                                    }}
                                    className="group cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
                                >
                                    <div className="h-40 overflow-hidden relative">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={`${item.title}｜モンゴル旅行ガイド`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-400">image</span>
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                                            {item.category}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-text-primary dark:text-white line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h4>
                                        <p className="text-sm text-text-secondary line-clamp-2">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav for easy navigation */}
            <BottomNav />
        </div>
    );
};
