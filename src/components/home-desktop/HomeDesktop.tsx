import type { HomeData } from '../../hooks/useHomeData';
import { HeroCarouselDesktop } from './HeroCarousel.desktop';
import { TourTabsSectionDesktop } from './TourTabsSection.desktop';
import { ThemeRowSectionDesktop } from './ThemeRowSection.desktop';
import { MagazineCardsDesktop } from './MagazineCards.desktop';
import { ReviewCardsDesktop } from './ReviewCards.desktop';
import { categoryImage, inCategory, isPublished, useHomeReviews } from './homeDesktopData';

interface Props {
    data: HomeData;
    isLoading: boolean;
}

/** PC home page (Claude Design "Milkyway Japan Home"). */
export function HomeDesktop({ data, isLoading }: Props) {
    const { reviews, stats } = useHomeReviews();
    const { categories, magazines } = data;
    const products = data.products.filter(isPublished);

    const cat = (id: string) => categories.find((c) => c.id === id);
    const gobi = cat('gobi-desert');
    const horse = cat('horse-riding-tour');
    const central = cat('central-mongolia');

    const gobiRow = products.filter((p) => (gobi && inCategory(p, gobi)) || (horse && inCategory(p, horse)));
    const centralRow = central ? products.filter((p) => inCategory(p, central)) : [];
    const firstImage = (list: typeof products) => list.find((p) => p.mainImages[0])?.mainImages[0] || '';

    return (
        <>
            <HeroCarouselDesktop products={products} />

            {/* SEO H1 — visible to crawlers, visually offscreen */}
            <section className="sr-only">
                <h1>モンゴルツアー・モンゴル旅行専門の現地旅行社</h1>
                <p>
                    Milkyway Japanは日本語ガイド同行で安心のモンゴルツアーをご案内。乗馬旅行、ゴビ砂漠、テレルジ国立公園など多彩なプランをご用意しています。
                </p>
            </section>

            {!isLoading && (
                <>
                    <TourTabsSectionDesktop products={products} categories={categories} />

                    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px 0', display: 'flex', flexDirection: 'column', gap: 72 }}>
                        <ThemeRowSectionDesktop
                            title="MILKYWAY × GOBI"
                            subtitle="砂丘・奇岩・恐竜化石の地を巡るゴビ砂漠ツアー"
                            products={gobiRow}
                            stats={stats}
                            image={categoryImage(gobi) || firstImage(gobiRow)}
                            imageAlt="ゴビ砂漠ツアー｜モンゴル旅行"
                            link="/category/gobi-desert"
                        />
                        <ThemeRowSectionDesktop
                            title="星空に出会う、中央モンゴル"
                            subtitle="大草原・ハラホリン・ゴルヒ渓谷を巡るゲル宿泊ツアー"
                            products={centralRow}
                            stats={stats}
                            image={categoryImage(central) || firstImage(centralRow)}
                            imageAlt="中央モンゴルツアー｜モンゴル旅行"
                            link="/category/central-mongolia"
                            reverse
                        />
                    </section>
                </>
            )}

            <MagazineCardsDesktop magazines={magazines} />
            <ReviewCardsDesktop reviews={reviews} />
        </>
    );
}
