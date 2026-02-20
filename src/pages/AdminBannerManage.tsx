import React, { useRef, useEffect, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../utils/upload';

interface Banner {
    id: string;
    image: string;
    tag: string;
    title: string;
    subtitle: string;
    link?: string;
}

interface QuickLink {
    id: string;
    icon: string; // Material Symbol name
    image?: string; // Custom uploaded image (Base64)
    label: string;
    path: string;
}

interface EventBanner {
    id: string;
    image?: string; // Optional custom background image
    backgroundColor: string; // Default background color if no image
    tag: string;
    title: string;
    icon: string; // Material symbol
    link: string;
    location?: 'home' | 'products' | 'all'; // New field
}

interface CategoryTab {
    id: string; // 'central', 'gobi', 'khuvsgul', etc.
    name: string; // The category key (e.g. '중앙몽골') used for filtering
    title: string;
    subtitle: string;
    bannerImage: string;
}

// Predefined Links for easy selection
const PREDEFINED_LINKS = [
    { label: '직접 입력', value: '' },
    { label: '홈 화면', value: '/' },
    { label: '여행상품 목록', value: '/products' },
    { label: '맞춤견적', value: '/custom-estimate' },
    { label: '동행찾기', value: '/travel-mates' },
    { label: '마이페이지', value: '/profile' },
    { label: '비즈니스', value: '/business-estimate' },
    { label: '여행가이드', value: '/travel-guide' },
];

const DEFAULT_BANNERS: Banner[] = [
    {
        id: 'banner-1',
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCa-lOI8hWg7jkEPE6aLpgULy46wN1zu_SdVj-gwNCoVza2ioMGm0cfT7njLma7CYQJ7YOCcomwafa5fKhJc9eO0hKtIafFHLoS9Vw_f3fyxGnxJkpkfUIBcpBSK8kb0onNzfKU-ImdlsG7T9ipvcqEVeiv0IkkaRjkNX43p7iWB42lYEVlHp-virwWcrmYH0R2SNXPmyNr-nNF55R-vs8rATJH09lIQgi22C3kyFBnx7gHhz_pjfvaFOI5i-SonHUBrrbuY_hnNQ",
        tag: "Premium Trip",
        title: "지평선 끝에서 만나는\n태초의 대자연, 몽골",
        subtitle: "지금 가장 인기 있는 테렐지 힐링 코스",
        link: "/products/1"
    },
    {
        id: 'banner-2',
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4K20GMVq8yGSfTci46S9biO_u2LDuxENlWBxUuJ0nn-vXp0HxEwZMChpGwntz2L5VISAaVTO0C3Jwe-ONgJLNcItHgdmG8Zb9pp-1uACHde5HETQBqmxnKmhs57ApVVkSCA6Kd-ta5q_h0ExQ84FYSY6vbGnDKD5yCJn-muLZnWDQCVEXnPd4YHvkNxzeRZmK1PN9XDNxQ1qdNDHGzJNqUkknzlI6FflIQG7Tnf1tHDg5TqEB8Gp1IlcZiBunTStiUDAFZDa0zQ",
        tag: "Gobi Adventure",
        title: "밤하늘을 수놓은\n쏟아지는 별빛 탐험",
        subtitle: "고비 사막 은하수 투어 얼리버드",
        link: "/products/2"
    }
];

const DEFAULT_LINKS: QuickLink[] = [
    { id: 'link-1', icon: 'grid_view', label: '여행상품', path: '/products' },
    { id: 'link-2', icon: 'receipt_long', label: '맞춤견적', path: '/custom-estimate' },
    { id: 'link-3', icon: 'groups', label: '동행찾기', path: '/travel-mates' },
    { id: 'link-4', icon: 'business_center', label: '비즈니스', path: '/business-estimate' },
    { id: 'link-5', icon: 'auto_stories', label: '여행가이드', path: '/travel-guide' },
];

const DEFAULT_EVENT_BANNERS: EventBanner[] = [
    {
        id: 'event-1',
        backgroundColor: '#0F766E', // teal-700
        tag: 'EVENT',
        title: '친구와 함께하면\n10만원 할인!',
        icon: 'redeem',
        link: '#',
        location: 'all'
    }
];

const DEFAULT_CATEGORY_TABS: CategoryTab[] = [
    {
        id: 'central',
        name: '중앙몽골',
        title: '중앙몽골의 대초원',
        subtitle: '테를지 국립공원부터 \n카라코룸 옛 수도까지',
        bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCViCzrsaryy2z22sZJjJC2yPok7E9fmP1eXTz5wxd0B9jW3b8ccHatM2GhE_PpfKvS4v62VtA9hKyqw0dGAuFEsBQax20AoO8MdCUXLg00zA8ODyeJZh-S9i4BUVoD3jx3bueEDMJeAJknjXRv9dg0xSf2FnfAZjPTTIHQoJm77_1r5C4ZlTxJWlzEkoI1s2BhdWPaYC11Q17j9_gAO2hS0gUFXxzfVl469Mp7kJGlkuZc39udLK16lJgqurk2l1VXHODjPbZ5gA'
    },
    {
        id: 'gobi',
        name: '고비사막',
        title: '쏟아지는 은하수',
        subtitle: '끝없이 펼쳐진 모래사막과 \n밤하늘의 별을 만나다',
        bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4K20GMVq8yGSfTci46S9biO_u2LDuxENlWBxUuJ0nn-vXp0HxEwZMChpGwntz2L5VISAaVTO0C3Jwe-ONgJLNcItHgdmG8Zb9pp-1uACHde5HETQBqmxnKmhs57ApVVkSCA6Kd-ta5q_h0ExQ84FYSY6vbGnDKD5yCJn-muLZnWDQCVEXnPd4YHvkNxzeRZmK1PN9XDNxQ1qdNDHGzJNqUkknzlI6FflIQG7Tnf1tHDg5TqEB8Gp1IlcZiBunTStiUDAFZDa0zQ'
    },
    {
        id: 'khuvsgul',
        name: '홉스굴',
        title: '몽골의 푸른 진주',
        subtitle: '지상 낙원 홉스굴 호수에서 \n즐기는 진정한 힐링',
        bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2c-W88eNfAuepIIez8D142m0RaAu5IIVeT9H7JHKMdO_hBpKiaj9qahcrzlVZlKjJqxXoq0VzO-Aw0A7EN_sDU5pp1smnpRkWy6O3lt4E4KuNi4L3q95jN8U_VmB_8uMcgoSNcE8b0HtZVflsg_87AOF659W686DmWlQPYRdZW0HyVcje7MtAmXT-KDvgPboK9HujomSiuwF7EPAIP4cC_s0405X2ZaWONxKLKPMLHrNtX-m2362SM10q9c7aC5w_afAeRLJU2w'
    },
];

export const AdminBannerManage: React.FC = () => {
    // Buffering state (changes applied here first)
    const [banners, setBanners] = useState<Banner[]>([]);
    const [links, setLinks] = useState<QuickLink[]>([]);
    const [eventBanners, setEventBanners] = useState<EventBanner[]>([]);
    const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI state
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const iconFileInputRef = useRef<HTMLInputElement>(null);
    const eventFileInputRef = useRef<HTMLInputElement>(null);
    const categoryFileInputRef = useRef<HTMLInputElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Initial Load from Supabase
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch hero banners
                const { data: bannerData } = await supabase.from('banners').select('*').eq('type', 'hero').order('order');
                if (bannerData && bannerData.length > 0) {
                    setBanners(bannerData.map((b: any) => ({
                        id: b.id,
                        image: b.image_url || b.image,
                        tag: b.tag || 'Premium Trip',
                        title: b.title,
                        subtitle: b.subtitle,
                        link: b.link
                    })));
                }

                // Fetch quick links
                const { data: linkData } = await supabase.from('quick_links').select('*').order('order');
                if (linkData && linkData.length > 0) {
                    setLinks(linkData.map((l: any) => ({
                        id: l.id,
                        icon: l.icon,
                        image: l.image,
                        label: l.label,
                        path: l.path
                    })));
                }

                // Fetch event banners
                const { data: eventData } = await supabase.from('event_banners').select('*').order('order');
                if (eventData && eventData.length > 0) {
                    setEventBanners(eventData.map((e: any) => ({
                        id: e.id,
                        image: e.image,
                        backgroundColor: e.background_color,
                        tag: e.tag,
                        title: e.title,
                        icon: e.icon,
                        link: e.link,
                        location: e.location
                    })));
                }

                // Fetch category tabs
                const { data: categoryData } = await supabase.from('banners').select('*').eq('type', 'category').order('order');
                if (categoryData && categoryData.length > 0) {
                    setCategoryTabs(categoryData.map((c: any) => ({
                        id: c.id,
                        name: c.name || c.tag,
                        title: c.title,
                        subtitle: c.subtitle,
                        bannerImage: c.image_url || c.image
                    })));
                }
            } catch (error) {
                console.error('Error fetching admin banner data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Change Detection
    const markUnsaved = () => setHasUnsavedChanges(true);

    // CRUD - Banners
    const addBanner = () => {
        const newId = `banner-${Date.now()}`;
        setBanners([...banners, {
            id: newId, image: "https://via.placeholder.com/800x500?text=New+Banner",
            tag: "New Tag", title: "새로운 배너 타이틀", subtitle: "배너 설명을 입력하세요", link: ""
        }]);
        markUnsaved();
    };

    const deleteBanner = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            setBanners(banners.filter(b => b.id !== id));
            markUnsaved();
        }
    };

    const handleBannerChange = (id: string, field: keyof Banner, value: string) => {
        setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));
        markUnsaved();
    };

    // CRUD - Links
    const addLink = () => {
        const newId = `link-${Date.now()}`;
        setLinks([...links, { id: newId, icon: 'star', label: '새 메뉴', path: '#' }]);
        markUnsaved();
    };

    const deleteLink = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            setLinks(links.filter(l => l.id !== id));
            markUnsaved();
        }
    };

    const moveLink = (index: number, direction: 'left' | 'right') => {
        const newLinks = [...links];
        if (direction === 'left') {
            if (index === 0) return;
            [newLinks[index - 1], newLinks[index]] = [newLinks[index], newLinks[index - 1]];
        } else {
            if (index === newLinks.length - 1) return;
            [newLinks[index], newLinks[index + 1]] = [newLinks[index + 1], newLinks[index]];
        }
        setLinks(newLinks);
        markUnsaved();
    };

    const handleLinkChange = (id: string, field: keyof QuickLink, value: string) => {
        setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l));
        markUnsaved();
    };

    // CRUD - Event Banners
    const addEventBanner = () => {
        const newId = `event-${Date.now()}`;
        setEventBanners([...eventBanners, {
            id: newId, backgroundColor: '#0F766E', tag: 'NEW', title: '새로운 이벤트', icon: 'campaign', link: '#', location: 'all'
        }]);
        markUnsaved();
    };
    const deleteEventBanner = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            setEventBanners(eventBanners.filter(e => e.id !== id));
            markUnsaved();
        }
    };
    const moveEventBanner = (index: number, direction: 'left' | 'right') => {
        const newEvents = [...eventBanners];
        if (direction === 'left') { if (index === 0) return;[newEvents[index - 1], newEvents[index]] = [newEvents[index], newEvents[index - 1]]; }
        else { if (index === newEvents.length - 1) return;[newEvents[index], newEvents[index + 1]] = [newEvents[index + 1], newEvents[index]]; }
        setEventBanners(newEvents); markUnsaved();
    };
    const handleEventChange = (id: string, field: keyof EventBanner, value: string) => {
        setEventBanners(eventBanners.map(e => e.id === id ? { ...e, [field]: value } : e));
        markUnsaved();
    };

    // CRUD - Category Tabs
    const handleCategoryChange = (id: string, field: keyof CategoryTab, value: string) => {
        setCategoryTabs(categoryTabs.map(c => c.id === id ? { ...c, [field]: value } : c));
        markUnsaved();
    };



    // Images
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'icon' | 'event' | 'category') => {
        const file = e.target.files?.[0];
        if (file && selectedId) {
            try {
                // Upload to Supabase Storage
                // Use different folders for organization
                let folder = 'banners';
                if (type === 'icon') folder = 'icons';
                if (type === 'event') folder = 'events';
                if (type === 'category') folder = 'categories';

                const publicUrl = await uploadImage(file, folder);

                if (type === 'banner') setBanners(banners.map(b => b.id === selectedId ? { ...b, image: publicUrl } : b));
                if (type === 'icon') setLinks(links.map(l => l.id === selectedId ? { ...l, image: publicUrl } : l));
                if (type === 'event') setEventBanners(eventBanners.map(ev => ev.id === selectedId ? { ...ev, image: publicUrl } : ev));
                if (type === 'category') setCategoryTabs(categoryTabs.map(c => c.id === selectedId ? { ...c, bannerImage: publicUrl } : c));
                markUnsaved();
            } catch (error) {
                console.error('Image upload failed:', error);
                alert('이미지 업로드 중 오류가 발생했습니다.');
            }
        }
    };

    // Save Action to Supabase
    const saveAll = async () => {
        try {
            // No payload size check needed for URL strings

            // Save hero banners - delete all and re-insert
            const { error: deleteError } = await supabase.from('banners').delete().eq('type', 'hero');
            if (deleteError) {
                console.error('Delete hero banners failed:', deleteError);
                throw deleteError; // Stop execution if delete fails
            }

            const bannerInserts = banners.map((b, index) => ({
                id: b.id,
                type: 'hero',
                image_url: b.image,

                tag: b.tag,
                title: b.title,
                subtitle: b.subtitle,
                link: b.link,
                order: index
            }));
            if (bannerInserts.length > 0) {
                const { error: insertError } = await supabase.from('banners').insert(bannerInserts);
                if (insertError) {
                    console.error('Insert hero banners failed:', insertError);
                    throw insertError;
                }
            }

            // Save quick links
            const { error: deleteLinkError } = await supabase.from('quick_links').delete().not('id', 'is', null);
            if (deleteLinkError) {
                console.error('Delete quick_links failed:', deleteLinkError);
                throw new Error('quick_links 삭제 실패: ' + deleteLinkError.message);
            }
            const linkInserts = links.map((l, index) => ({
                id: l.id,
                icon: l.icon,
                image: l.image,
                label: l.label,
                path: l.path,
                order: index
            }));
            if (linkInserts.length > 0) {
                const { error: linkError } = await supabase.from('quick_links').insert(linkInserts);
                if (linkError) {
                    console.error('Insert quick_links failed:', linkError);
                    throw new Error('quick_links 저장 실패: ' + linkError.message);
                }
            }

            // Save event banners
            const { error: deleteEventError } = await supabase.from('event_banners').delete().not('id', 'is', null);
            if (deleteEventError) {
                console.error('Delete event_banners failed:', deleteEventError);
                throw new Error('event_banners 삭제 실패: ' + deleteEventError.message);
            }
            const eventInserts = eventBanners.map((e, index) => ({
                id: e.id,
                image: e.image,
                background_color: e.backgroundColor,
                tag: e.tag,
                title: e.title,
                icon: e.icon,
                link: e.link,
                location: e.location,
                order: index
            }));
            if (eventInserts.length > 0) {
                const { error: eventError } = await supabase.from('event_banners').insert(eventInserts);
                if (eventError) {
                    console.error('Insert event_banners failed:', eventError);
                    throw new Error('event_banners 저장 실패: ' + eventError.message);
                }
            }

            // Save category tabs
            const { error: deleteCatError } = await supabase.from('banners').delete().eq('type', 'category');
            if (deleteCatError) {
                console.error('Delete category tabs failed:', deleteCatError);
                throw new Error('category tabs 삭제 실패: ' + deleteCatError.message);
            }
            const categoryInserts = categoryTabs.map((c, index) => ({
                id: c.id,
                type: 'category',
                name: c.name,
                tag: c.name,
                title: c.title,
                subtitle: c.subtitle,
                image_url: c.bannerImage,
                order: index
            }));
            if (categoryInserts.length > 0) {
                const { error: catError } = await supabase.from('banners').insert(categoryInserts);
                if (catError) {
                    console.error('Insert category tabs failed:', catError);
                    throw new Error('category tabs 저장 실패: ' + catError.message);
                }
            }

            setHasUnsavedChanges(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('저장 중 오류가 발생했습니다:\n\n' + (error.message || '알 수 없는 오류'));
        }
    };

    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar
                activePage="banners"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        홈 화면 관리
                        {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                    </h1>
                    <button
                        onClick={saveAll}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-lg flex items-center gap-2
                        ${hasUnsavedChanges
                                ? 'bg-teal-500 text-white hover:bg-teal-600 hover:scale-105'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-lg">save</span>
                        변경사항 저장
                    </button>
                </header>

                <div className="p-8 space-y-8 max-w-5xl">

                    {/* Banners Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">ad_units</span>
                                메인 배너 관리 (상단 슬라이드)
                            </h2>
                            <button onClick={addBanner} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                배너 추가
                            </button>
                        </div>

                        <input type="file" ref={bannerFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'banner')} />

                        <div className="space-y-6">
                            {banners.map((banner, index) => (
                                <div key={banner.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-6 group relative bg-slate-50/50 hover:bg-white transition-colors hover:shadow-sm">
                                    <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full z-10">#{index + 1}</div>
                                    <button
                                        onClick={() => deleteBanner(banner.id)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1"
                                        title="삭제"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>

                                    <div
                                        className="w-48 aspect-[16/10] bg-slate-200 rounded-lg bg-cover bg-center shrink-0 relative group/img cursor-pointer border border-slate-200 text-slate-800"
                                        style={{ backgroundImage: `url('${banner.image}')` }}
                                        onClick={() => { setSelectedId(banner.id); bannerFileInputRef.current?.click(); }}
                                    >
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 pr-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">태그 (Tag)</label>
                                                <input
                                                    type="text"
                                                    value={banner.tag}
                                                    onChange={(e) => handleBannerChange(banner.id, 'tag', e.target.value)}
                                                    className="w-full text-sm font-medium border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">링크 (Link)</label>
                                                <input
                                                    type="text"
                                                    value={banner.link || ''}
                                                    placeholder="/products/..."
                                                    onChange={(e) => handleBannerChange(banner.id, 'link', e.target.value)}
                                                    className="w-full text-xs text-blue-500 border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">제목 (Title)</label>
                                            <textarea
                                                value={banner.title}
                                                onChange={(e) => handleBannerChange(banner.id, 'title', e.target.value)}
                                                className="w-full text-sm font-bold border-slate-200 rounded px-2 py-1 whitespace-pre-wrap h-14 resize-none focus:ring-1 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">부제목 (Subtitle)</label>
                                            <input
                                                type="text"
                                                value={banner.subtitle}
                                                onChange={(e) => handleBannerChange(banner.id, 'subtitle', e.target.value)}
                                                className="w-full text-xs text-slate-500 border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {banners.length === 0 && (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    등록된 배너가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Icons Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">grid_view</span>
                                바로가기 아이콘 관리
                            </h2>
                            <button onClick={addLink} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                아이콘 추가
                            </button>
                        </div>

                        <input type="file" ref={iconFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'icon')} />

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {links.map((link, index) => (
                                <div key={link.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3 relative group bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all text-center">
                                    <div className="absolute top-2 w-full px-2 flex justify-between opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
                                        <button
                                            onClick={() => moveLink(index, 'left')}
                                            disabled={index === 0}
                                            className="pointer-events-auto p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                                        </button>
                                        <button
                                            onClick={() => moveLink(index, 'right')}
                                            disabled={index === links.length - 1}
                                            className="pointer-events-auto p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => deleteLink(link.id)}
                                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border border-slate-100 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="삭제"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>

                                    <div
                                        className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center relative group/img cursor-pointer overflow-hidden border border-slate-100 shadow-sm"
                                        onClick={() => { setSelectedId(link.id); iconFileInputRef.current?.click(); }}
                                    >
                                        {link.image ? (
                                            <img src={link.image} alt="icon" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-400 text-2xl">{link.icon}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white text-sm">edit</span>
                                        </div>
                                    </div>

                                    <div className="w-full space-y-2">
                                        <input
                                            type="text"
                                            value={link.label}
                                            placeholder="라벨"
                                            onChange={(e) => handleLinkChange(link.id, 'label', e.target.value)}
                                            className="text-xs font-bold text-center w-full border-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                                        />
                                        <input
                                            type="text"
                                            value={link.path}
                                            placeholder="링크"
                                            onChange={(e) => handleLinkChange(link.id, 'path', e.target.value)}
                                            className="text-[10px] text-slate-400 text-center w-full border-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Event Banners Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">campaign</span>
                                이벤트 배너 관리 (가로 스크롤)
                            </h2>
                            <button onClick={addEventBanner} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                이벤트 추가
                            </button>
                        </div>

                        <input type="file" ref={eventFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'event')} />

                        <div className="space-y-4">
                            {eventBanners.map((banner, index) => (
                                <div key={banner.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-6 group relative bg-slate-50/50 hover:bg-white transition-colors hover:shadow-sm items-center">
                                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                                        <button onClick={() => moveEventBanner(index, 'left')} disabled={index === 0} className="p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 bg-white/80 rounded-full shadow-sm"><span className="material-symbols-outlined text-base">arrow_upward</span></button>
                                        <button onClick={() => moveEventBanner(index, 'right')} disabled={index === eventBanners.length - 1} className="p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 bg-white/80 rounded-full shadow-sm"><span className="material-symbols-outlined text-base">arrow_downward</span></button>
                                    </div>
                                    <button onClick={() => deleteEventBanner(banner.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1" title="삭제"><span className="material-symbols-outlined">delete</span></button>

                                    {/* Preview */}
                                    <div
                                        className="w-48 h-24 rounded-lg flex items-center justify-between p-4 shadow-sm relative group/img cursor-pointer shrink-0"
                                        style={{
                                            background: banner.image ? `url('${banner.image}') center/cover` : banner.backgroundColor
                                        }}
                                        onClick={() => { setSelectedId(banner.id); eventFileInputRef.current?.click(); }}
                                    >
                                        {/* ... preview content ... */}
                                        {!banner.image && (
                                            <>
                                                <div>
                                                    <p className="text-white/80 text-[10px] font-bold uppercase">{banner.tag}</p>
                                                    <h4 className="text-white font-bold text-xs whitespace-pre-wrap">{banner.title}</h4>
                                                </div>
                                                <span className="material-symbols-outlined text-white/50 text-2xl">{banner.icon}</span>
                                            </>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="flex-1 space-y-3 pr-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">배경색 (Image 없을 때)</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={banner.backgroundColor} onChange={(e) => handleEventChange(banner.id, 'backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0" />
                                                    <input type="text" value={banner.backgroundColor} onChange={(e) => handleEventChange(banner.id, 'backgroundColor', e.target.value)} className="flex-1 text-xs border-slate-200 rounded px-2" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">표시 위치</label>
                                                <select
                                                    value={banner.location || 'all'}
                                                    onChange={(e) => handleEventChange(banner.id, 'location', e.target.value)}
                                                    className="w-full text-xs border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 outline-none"
                                                >
                                                    <option value="all">전체 (홈 + 여행상품)</option>
                                                    <option value="home">홈 화면만</option>
                                                    <option value="products">여행상품 페이지만</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">태그</label>
                                                <input type="text" value={banner.tag} onChange={(e) => handleEventChange(banner.id, 'tag', e.target.value)} className="w-full text-xs font-bold border-slate-200 rounded px-2 py-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">링크</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        className="w-1/3 text-xs border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 outline-none"
                                                        onChange={(e) => {
                                                            if (e.target.value) handleEventChange(banner.id, 'link', e.target.value);
                                                            // If selecting a predefined link that isn't empty, valid. If empty (direct input), handled by input.
                                                        }}
                                                        value={PREDEFINED_LINKS.some(l => l.value === banner.link) ? banner.link : ''}
                                                    >
                                                        {PREDEFINED_LINKS.map(l => (
                                                            <option key={l.label} value={l.value}>{l.label}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={banner.link}
                                                        onChange={(e) => handleEventChange(banner.id, 'link', e.target.value)}
                                                        className="flex-1 text-xs text-blue-500 border-slate-200 rounded px-2 py-1"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">제목 (줄바꿈 가능)</label>
                                            <textarea value={banner.title} onChange={(e) => handleEventChange(banner.id, 'title', e.target.value)} className="w-full text-sm border-slate-200 rounded px-2 py-1 h-12 resize-none" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Category Tabs Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">category</span>
                                여행지 테마 배너 관리 (탭 이미지)
                            </h2>
                        </div>

                        <input type="file" ref={categoryFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'category')} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {categoryTabs.map((tab) => (
                                <div key={tab.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group relative bg-white transition-all hover:shadow-md flex flex-col">

                                    {/* Image Preview Area */}
                                    <div
                                        className="w-full aspect-[4/3] bg-slate-200 bg-cover bg-center relative group/img cursor-pointer"
                                        style={{ backgroundImage: `url('${tab.bannerImage}')` }}
                                        onClick={() => { setSelectedId(tab.id); categoryFileInputRef.current?.click(); }}
                                    >
                                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-bold z-10">
                                            {tab.name}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white text-3xl mb-1">add_photo_alternate</span>
                                            <span className="text-white text-xs font-medium">이미지 변경</span>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                                        <div>
                                            <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">제목</label>
                                            <input
                                                type="text"
                                                value={tab.title}
                                                onChange={(e) => handleCategoryChange(tab.id, 'title', e.target.value)}
                                                className="w-full text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 py-1 focus:border-teal-500 outline-none bg-transparent transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">부제목</label>
                                            <textarea
                                                value={tab.subtitle}
                                                onChange={(e) => handleCategoryChange(tab.id, 'subtitle', e.target.value)}
                                                className="w-full text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg p-2 h-20 resize-none focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 dark:bg-slate-800/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-in z-[100]">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <span className="font-bold text-sm">저장되었습니다!</span>
                </div>
            )}
        </div>
    );
};
