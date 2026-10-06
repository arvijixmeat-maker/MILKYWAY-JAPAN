import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { SimpleSlider } from '../components/ui/SimpleSlider';
import { LocationCard } from '../components/magazine/LocationCard';
import type { LocationInfo } from '../components/magazine/LocationCard';
import { useTranslation } from 'react-i18next';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { MagazineArticleDesktop } from '../components/magazine-desktop/MagazineArticleDesktop';
import type { MagazineListItem } from '../components/magazine-desktop/MagazineListDesktop';
import { MobileShell } from '../components/mobile/MobileShell';
import { MEmpty, MLoading } from '../components/mobile/mobileUi';
import { MagazineArticleMobile } from '../components/magazine-mobile/MagazineArticleMobile';

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

/** List row as returned by /api/magazines (snake_case). */
interface RawMagazine {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    category: string;
    thumbnail?: string;
    image?: string;
    is_active?: boolean | number | null;
    order?: number;
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
    // Every published article in list order — used for prev/next and "その他の記事".
    const [allMagazines, setAllMagazines] = useState<MagazineListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const isDesktop = useIsDesktop();

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

                // 2. Fetch the article list (prev/next + related articles are picked client-side)
                const allMagazines = await api.magazines.list();
                if (Array.isArray(allMagazines)) {
                    setAllMagazines(allMagazines
                        .filter((m: RawMagazine) => m.is_active ?? true)
                        .sort((a: RawMagazine, b: RawMagazine) => (a.order || 0) - (b.order || 0))
                        .map((m: RawMagazine) => ({
                            id: m.id,
                            title: m.title,
                            description: m.subtitle || m.description || '',
                            category: m.category,
                            image: m.thumbnail || m.image || '',
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

    // Both shells keep the site header/footer around loading and not-found states.
    if (!isDesktop && (loading || !magazine)) {
        return (
            <>
                {/* Empty slot where <SEO> sits once loaded: same tree shape, so the shell is not remounted. */}
                {null}
                <MobileShell title="旅マガジン">
                    {loading ? (
                        <MLoading />
                    ) : (
                        <div style={{ padding: '24px 16px 0' }}>
                            <MEmpty
                                text={t('travel_guide.detail.loading_or_not_found')}
                                action={{ label: t('travel_guide.detail.go_back_to_list'), onClick: () => navigate('/travel-guide') }}
                            />
                        </div>
                    )}
                </MobileShell>
            </>
        );
    }

    if (loading) {
        return (
            <DesktopLayout>
                <div className="min-h-[60vh] bg-white dark:bg-slate-900 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
            </DesktopLayout>
        );
    }

    if (!magazine) {
        return (
            <DesktopLayout>
                <div className="min-h-[60vh] bg-white dark:bg-slate-900 flex items-center justify-center">
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
            </DesktopLayout>
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
    const seo = (
        <SEO
            title={magazine.title}
            description={magazine.description}
            image={magazine.image}
            keywords={`${magazine.category}, ${magazine.tag || ''}`}
            canonical={canonicalPath}
            structuredData={[articleLd, breadcrumbLd, faqLd]}
        />
    );

    const pos = allMagazines.findIndex((m) => m.id === magazine.id);
    const others = allMagazines.filter((m) => m.id !== magazine.id);
    // Same-category articles first, then the rest, three in total.
    const more = [
        ...others.filter((m) => m.category === magazine.category),
        ...others.filter((m) => m.category !== magazine.category),
    ].slice(0, 3);
    const prev = pos > 0 ? allMagazines[pos - 1] : undefined;
    const next = pos >= 0 && pos < allMagazines.length - 1 ? allMagazines[pos + 1] : undefined;

    if (isDesktop) {
        return (
            <>
                {seo}
                <DesktopLayout>
                    <MagazineArticleDesktop
                        magazine={magazine}
                        body={renderContent(magazine.content || '')}
                        faqs={magazineFaqs}
                        more={more}
                        prev={prev}
                        next={next}
                    />
                </DesktopLayout>
            </>
        );
    }

    return (
        <>
            {seo}
            <MobileShell title="旅マガジン">
                <MagazineArticleMobile
                    magazine={magazine}
                    body={renderContent(magazine.content || '')}
                    faqs={magazineFaqs}
                    more={more}
                    prev={prev}
                    next={next}
                />
            </MobileShell>
        </>
    );
};
