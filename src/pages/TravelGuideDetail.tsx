import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/layout/BottomNav';
import { SEO } from '../components/seo/SEO';
import { SimpleSlider } from '../components/ui/SimpleSlider';

interface Magazine {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    image: string;
    tag?: string;
    createdAt: string;
}

export const TravelGuideDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [relatedMagazines, setRelatedMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMagazine = async () => {
            if (!id) return;
            setLoading(true);

            // 1. Fetch current magazine
            const { data: magData, error } = await supabase
                .from('magazines')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !magData) {
                console.error('Error fetching magazine:', error);
                setLoading(false);
                return;
            }

            const currentMagazine = {
                id: magData.id,
                title: magData.title,
                description: magData.description,
                content: magData.content,
                category: magData.category,
                image: magData.image,
                tag: magData.tag,
                createdAt: magData.created_at
            };
            setMagazine(currentMagazine);

            // 2. Fetch related magazines
            const { data: relatedData } = await supabase
                .from('magazines')
                .select('*')
                .eq('category', magData.category)
                .neq('id', id)
                .eq('is_active', true)
                .limit(3);

            if (relatedData) {
                setRelatedMagazines(relatedData.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    content: m.content,
                    category: m.category,
                    image: m.image,
                    tag: m.tag,
                    createdAt: m.created_at
                })));
            }
            setLoading(false);
        };

        fetchMagazine();
    }, [id]);

    // Content Renderer
    const renderContent = (content: string) => {
        if (!content) return <p>내용이 없습니다.</p>;

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const childNodes = Array.from(doc.body.childNodes);

        const result: React.ReactNode[] = [];
        let htmlBuffer = '';

        childNodes.forEach((node, index) => {
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains('magazine-slider')) {
                // Flush buffer if exists
                if (htmlBuffer) {
                    result.push(<div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: htmlBuffer }} />);
                    htmlBuffer = '';
                }

                // Render Slider
                const imagesStr = (node as Element).getAttribute('data-images');
                if (imagesStr) {
                    const images = imagesStr.split(',');
                    result.push(<SimpleSlider key={`slider-${index}`} images={images} />);
                }
            } else {
                // Aggressive Zombie Cleanup:
                // Check if this node is the editor visual representation (thumbnails) but missing the class
                const element = node as Element;
                if (node.nodeType === Node.ELEMENT_NODE &&
                    element.tagName === 'DIV' &&
                    element.textContent &&
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
            result.push(<div key="html-end" dangerouslySetInnerHTML={{ __html: htmlBuffer }} />);
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
                    <p className="text-slate-500 mb-4">매거진을 불러오는 중이거나 찾을 수 없습니다.</p>
                    <button
                        onClick={() => navigate('/travel-guide')}
                        className="text-primary font-bold hover:underline"
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 min-h-screen pb-24 font-display overflow-x-hidden">
            <SEO
                title={magazine.title}
                description={magazine.description}
                image={magazine.image}
                keywords={`${magazine.category}, ${magazine.tag || ''}`}
            />
            {/* Header Image */}
            <div className="relative h-[300px] md:h-[400px]">
                {magazine.image ? (
                    <img
                        src={magazine.image}
                        alt={magazine.title}
                        className="w-full h-full object-cover"
                    />
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

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-primary px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm">
                            {magazine.category}
                        </span>
                        {magazine.tag && (
                            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold text-white border border-white/30">
                                {magazine.tag}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-2 drop-shadow-sm">
                        {magazine.title}
                    </h1>
                    <div className="text-white/80 text-sm font-medium flex items-center gap-2">
                        <span>{new Date(magazine.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="max-w-3xl mx-auto px-5 py-8">
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
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    {renderContent(magazine.content || '')}
                </div>

                {/* Related Magazines */}
                {relatedMagazines && relatedMagazines.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-text-primary dark:text-white mb-6">
                            이 가이드는 어떠세요? 👀
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
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
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
