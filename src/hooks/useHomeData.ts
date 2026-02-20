import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

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
            const [productsResult, tabsResult, magazinesResult] = await Promise.all([
                // Fetch products (Minimal columns)
                supabase.from('products').select('id, name, category, price, main_images, duration, tags'),
                // Fetch category tabs/banners
                supabase.from('banners').select('id, name, title, subtitle, image_url').eq('type', 'category').order('order'),
                // Fetch magazines
                supabase.from('magazines').select('id, title, description, category, image, is_active').eq('is_active', true).order('order')
            ]);

            const products: Product[] = (productsResult.data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                mainImages: p.main_images || [],
                duration: p.duration,
                tags: p.tags || []
            }));

            const tabs: CategoryTab[] = (tabsResult.data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                title: t.title,
                subtitle: t.subtitle,
                bannerImage: t.image_url
            }));

            const magazines: Magazine[] = (magazinesResult.data || []).map((m: any) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                category: m.category,
                image: m.image,
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
