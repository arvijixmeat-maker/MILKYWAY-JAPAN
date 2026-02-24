import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface CategoryTab {
    id: string;
    name: string;
    title: string;
    subtitle: string;
    bannerImage: string;
}

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    mainImages: string[];
    duration: string;
    tags: string[];
}

interface Magazine {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    isActive: boolean;
}

export interface HomeData {
    products: Product[];
    tabs: CategoryTab[];
    magazines: Magazine[];
}

export const useHomeData = () => {
    const { data: queryData, isLoading, error } = useQuery({
        queryKey: ['homeData'],
        queryFn: async () => {
            // Fetch all data in parallel using Promise.all
            const [productsData, bannersData, magazinesData] = await Promise.all([
                api.products.list(),
                api.banners.get(),
                api.magazines.list()
            ]);

            const products: Product[] = (Array.isArray(productsData) ? productsData : []).map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                mainImages: p.main_images || [],
                duration: p.duration,
                tags: p.tags || []
            }));

            const tabsArray = Array.isArray(bannersData) ? bannersData.filter((b: any) => b.type === 'category') : [];
            const tabs: CategoryTab[] = tabsArray.map((t: any) => ({
                id: t.id,
                name: t.name,
                title: t.title,
                subtitle: t.subtitle,
                bannerImage: t.image_url
            }));

            const magazines: Magazine[] = (Array.isArray(magazinesData) ? magazinesData.filter((m: any) => m.is_active) : []).map((m: any) => ({
                id: m.id,
                title: m.title,
                description: m.subtitle || m.description || '', // mapped from subtitle
                category: m.category,
                image: m.thumbnail || m.image || '', // mapped from thumbnail
                isActive: m.is_active
            }));

            return { products, tabs, magazines };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30,   // 30 minutes
        refetchOnWindowFocus: false,
    });

    // Provide default empty values to match previous interface
    const data: HomeData = queryData || {
        products: [],
        tabs: [],
        magazines: []
    };

    return { data, isLoading, error };
};
