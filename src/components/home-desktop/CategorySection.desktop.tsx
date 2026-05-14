import { useNavigate } from 'react-router-dom';
import type { HomeData } from '../../hooks/useHomeData';
import type { Category } from '../../types/category';
import { SectionHeader } from '../desktop-primitives/SectionHeader';
import { HScroller } from '../desktop-primitives/HScroller';
import { PCard } from '../desktop-primitives/PCard';

interface CategorySectionProps {
    category: Category;
    products: HomeData['products'];
    contentWidth?: number;
}

export function CategorySectionDesktop({ category, products, contentWidth = 1280 }: CategorySectionProps) {
    const navigate = useNavigate();
    const filtered = products.filter((p) => p.category === category.name || p.category === category.id);
    if (filtered.length === 0) return null;

    const eyebrowMap: Record<string, string> = {
        'horse-riding-tour': 'Horse Riding',
        'gobi-desert': 'Gobi Desert',
        'central-mongolia': 'Central Mongolia',
        'terelj': 'Terelj',
        'hovsgol': 'Khövsgöl',
    };

    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '56px 32px 0' }}>
            <SectionHeader
                eyebrow={eyebrowMap[category.id]}
                title={category.name}
                subtitle={category.description}
                onAll={() => navigate(`/category/${category.id}`)}
            />
            <HScroller gap={16} padX={32} snap>
                {filtered.map((p) => (
                    <PCard
                        key={p.id}
                        p={{
                            id: p.id,
                            name: p.name,
                            category: p.category,
                            duration: p.duration,
                            price: p.price,
                            mainImages: p.mainImages,
                            tags: p.tags,
                        }}
                        onClick={() => navigate(`/products/${p.id}`)}
                    />
                ))}
            </HScroller>
        </section>
    );
}
