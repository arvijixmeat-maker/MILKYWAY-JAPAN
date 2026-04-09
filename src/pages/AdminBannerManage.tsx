import React, { useRef, useEffect, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
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
    name: string; // The category key (e.g. 'Ï§ëÏïôÎ™ΩÍ≥®') used for filtering
    title: string;
    subtitle: string;
    bannerImage: string;
}

// Predefined Links for easy selection
const PREDEFINED_LINKS = [
    { label: 'ÏßÅÏ†ë ?ÖÎ†•', value: '' },
    { label: '???îÎ©¥', value: '/' },
    { label: '?¨Ìñâ?ÅÌíà Î™©Î°ù', value: '/products' },
    { label: 'ÎßûÏ∂§Í≤¨Ï†Å', value: '/custom-estimate' },
    { label: '?ôÌñâÏ∞æÍ∏∞', value: '/travel-mates' },
    { label: 'ÎßàÏù¥?òÏù¥ÏßÄ', value: '/profile' },

    { label: '?¨ÌñâÍ∞Ä?¥Îìú', value: '/travel-guide' },
];

const DEFAULT_BANNERS: Banner[] = [
    {
        id: 'banner-1',
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCa-lOI8hWg7jkEPE6aLpgULy46wN1zu_SdVj-gwNCoVza2ioMGm0cfT7njLma7CYQJ7YOCcomwafa5fKhJc9eO0hKtIafFHLoS9Vw_f3fyxGnxJkpkfUIBcpBSK8kb0onNzfKU-ImdlsG7T9ipvcqEVeiv0IkkaRjkNX43p7iWB42lYEVlHp-virwWcrmYH0R2SNXPmyNr-nNF55R-vs8rATJH09lIQgi22C3kyFBnx7gHhz_pjfvaFOI5i-SonHUBrrbuY_hnNQ",
        tag: "Premium Trip",
        title: "ÏßÄ?âÏÑ† ?ùÏóê??ÎßåÎÇò??n?úÏ¥à???Ä?êÏó∞, Î™ΩÍ≥®",
        subtitle: "ÏßÄÍ∏?Í∞Ä???∏Í∏∞ ?àÎäî ?åÎ†êÏßÄ ?êÎßÅ ÏΩîÏä§",
        link: "/products/1"
    },
    {
        id: 'banner-2',
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4K20GMVq8yGSfTci46S9biO_u2LDuxENlWBxUuJ0nn-vXp0HxEwZMChpGwntz2L5VISAaVTO0C3Jwe-ONgJLNcItHgdmG8Zb9pp-1uACHde5HETQBqmxnKmhs57ApVVkSCA6Kd-ta5q_h0ExQ84FYSY6vbGnDKD5yCJn-muLZnWDQCVEXnPd4YHvkNxzeRZmK1PN9XDNxQ1qdNDHGzJNqUkknzlI6FflIQG7Tnf1tHDg5TqEB8Gp1IlcZiBunTStiUDAFZDa0zQ",
        tag: "Gobi Adventure",
        title: "Î∞§Ìïò?òÏùÑ ?òÎÜì?Ä\n?üÏïÑÏßÄ??Î≥ÑÎπõ ?êÌóò",
        subtitle: "Í≥†ÎπÑ ?¨Îßâ ?Ä?òÏàò ?¨Ïñ¥ ?ºÎ¶¨Î≤ÑÎìú",
        link: "/products/2"
    }
];

const DEFAULT_LINKS: QuickLink[] = [
    { id: 'link-1', icon: 'grid_view', label: '?¨Ìñâ?ÅÌíà', path: '/products' },
    { id: 'link-2', icon: 'receipt_long', label: 'ÎßûÏ∂§Í≤¨Ï†Å', path: '/custom-estimate' },
    { id: 'link-3', icon: 'groups', label: '?ôÌñâÏ∞æÍ∏∞', path: '/travel-mates' },

    { id: 'link-5', icon: 'auto_stories', label: '?¨ÌñâÍ∞Ä?¥Îìú', path: '/travel-guide' },
];

const DEFAULT_EVENT_BANNERS: EventBanner[] = [
    {
        id: 'event-1',
        backgroundColor: '#0F766E', // teal-700
        tag: 'EVENT',
        title: 'ÏπúÍµ¨?Ä ?®Íªò?òÎ©¥\n10ÎßåÏõê ?†Ïù∏!',
        icon: 'redeem',
        link: '#',
        location: 'all'
    }
];

const DEFAULT_CATEGORY_TABS: CategoryTab[] = [
    {
        id: 'central',
        name: 'Ï§ëÏïôÎ™ΩÍ≥®',
        title: 'Ï§ëÏïôÎ™ΩÍ≥®???ÄÏ¥àÏõê',
        subtitle: '?åÎ?ÏßÄ Íµ?¶ΩÍ≥µÏõêÎ∂Ä??\nÏπ¥ÎùºÏΩîÎ£∏ ???òÎèÑÍπåÏ?',
        bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCViCzrsaryy2z22sZJjJC2yPok7E9fmP1eXTz5wxd0B9jW3b8ccHatM2GhE_PpfKvS4v62VtA9hKyqw0dGAuFEsBQax20AoO8MdCUXLg00zA8ODyeJZh-S9i4BUVoD3jx3bueEDMJeAJknjXRv9dg0xSf2FnfAZjPTTIHQoJm77_1r5C4ZlTxJWlzEkoI1s2BhdWPaYC11Q17j9_gAO2hS0gUFXxzfVl469Mp7kJGlkuZc39udLK16lJgqurk2l1VXHODjPbZ5gA'
    },
    {
        id: 'gobi',
        name: 'Í≥†ÎπÑ?¨Îßâ',
        title: '?üÏïÑÏßÄ???Ä?òÏàò',
        subtitle: '?ùÏóÜ???ºÏ≥êÏß?Î™®Îûò?¨ÎßâÍ≥?\nÎ∞§Ìïò?òÏùò Î≥ÑÏùÑ ÎßåÎÇò??,
        bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4K20GMVq8yGSfTci46S9biO_u2LDuxENlWBxUuJ0nn-vXp0HxEwZMChpGwntz2L5VISAaVTO0C3Jwe-ONgJLNcItHgdmG8Zb9pp-1uACHde5HETQBqmxnKmhs57ApVVkSCA6Kd-ta5q_h0ExQ84FYSY6vbGnDKD5yCJn-muLZnWDQCVEXnPd4YHvkNxzeRZmK1PN9XDNxQ1qdNDHGzJNqUkknzlI6FflIQG7Tnf1tHDg5TqEB8Gp1IlcZiBunTStiUDAFZDa0zQ'
    },
    {
        id: 'khuvsgul',
        name: '?âÏä§Íµ?,
        title: 'Î™ΩÍ≥®???∏Î•∏ ÏßÑÏ£º',
        subtitle: 'ÏßÄ???ôÏõê ?âÏä§Íµ??∏Ïàò?êÏÑú \nÏ¶êÍ∏∞??ÏßÑÏ†ï???êÎßÅ',
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
    const customQuoteFileInputRef = useRef<HTMLInputElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number | null>(null);
    const [customQuoteBanners, setCustomQuoteBanners] = useState<string[]>([]);

    // Initial Load from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await api.banners.get();
                if (data.banners && data.banners.length > 0) {
                    setBanners(data.banners.map((b: any) => ({
                        id: b.id, image: b.image, tag: b.tag || 'Premium Trip',
                        title: b.title, subtitle: b.subtitle, link: b.link
                    })));
                }
                if (data.quickLinks && data.quickLinks.length > 0) {
                    setLinks(data.quickLinks.map((l: any) => ({
                        id: l.id, icon: l.icon, image: l.image, label: l.label, path: l.path
                    })));
                }
                if (data.eventBanners && data.eventBanners.length > 0) {
                    setEventBanners(data.eventBanners.map((e: any) => ({
                        id: e.id, image: e.image, backgroundColor: e.background_color,
                        tag: e.tag, title: e.title, icon: e.icon, link: e.link, location: e.location
                    })));
                }
                if (data.categoryTabs && data.categoryTabs.length > 0) {
                    setCategoryTabs(data.categoryTabs.map((c: any) => ({
                        id: c.id, name: c.name, title: c.title, subtitle: c.subtitle, bannerImage: c.banner_image
                    })));
                }

                // Fetch custom quote banners from settings
                const settingsData = await api.settings.get('customQuoteBanners');
                if (settingsData && settingsData.customQuoteBanners) {
                    try {
                        const parsed = JSON.parse(settingsData.customQuoteBanners);
                        if (Array.isArray(parsed)) setCustomQuoteBanners(parsed);
                    } catch (e) {
                        console.error('Error parsing customQuoteBanners:', e);
                    }
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
            id: newId, image: "",
            tag: "", title: "", subtitle: "", link: ""
        }]);
        markUnsaved();
    };

    const deleteBanner = (id: string) => {
        if (confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
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
        setLinks([...links, { id: newId, icon: 'star', label: '??Î©îÎâ¥', path: '#' }]);
        markUnsaved();
    };

    const deleteLink = (id: string) => {
        if (confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
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
            id: newId, backgroundColor: '#0F766E', tag: 'NEW', title: '?àÎ°ú???¥Î≤§??, icon: 'campaign', link: '#', location: 'all'
        }]);
        markUnsaved();
    };
    const deleteEventBanner = (id: string) => {
        if (confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
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

    // CRUD - Custom Quote Banners
    const addCustomQuoteBanner = () => {
        setCustomQuoteBanners([...customQuoteBanners, '']);
        markUnsaved();
    };

    const deleteCustomQuoteBanner = (index: number) => {
        if (confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
            const newBanners = [...customQuoteBanners];
            newBanners.splice(index, 1);
            setCustomQuoteBanners(newBanners);
            markUnsaved();
        }
    };

    const moveCustomQuoteBanner = (index: number, direction: 'left' | 'right') => {
        const newBanners = [...customQuoteBanners];
        if (direction === 'left') {
            if (index === 0) return;
            [newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]];
        } else {
            if (index === newBanners.length - 1) return;
            [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
        }
        setCustomQuoteBanners(newBanners);
        markUnsaved();
    };

    // Images
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'icon' | 'event' | 'category' | 'quote') => {
        const file = e.target.files?.[0];
        if (file && selectedId) {
            try {
                // Upload to Cloudflare R2
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
                if (type === 'quote' && selectedQuoteIndex !== null) {
                    const newBanners = [...customQuoteBanners];
                    newBanners[selectedQuoteIndex] = publicUrl;
                    setCustomQuoteBanners(newBanners);
                }
                markUnsaved();
            } catch (error) {
                console.error('Image upload failed:', error);
                alert('?¥Î?ÏßÄ ?ÖÎ°ú??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.');
            }
        }
    };

    // Save Action via API
    const saveAll = async () => {
        try {
            await api.banners.save({ banners, quickLinks: links, eventBanners, categoryTabs });
            await api.settings.save('customQuoteBanners', customQuoteBanners.filter(b => b)); // Empty string filter
            
            setHasUnsavedChanges(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§:\n\n' + (error.message || '?????ÜÎäî ?§Î•ò'));
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
                        ???îÎ©¥ Í¥ÄÎ¶?
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
                        Î≥ÄÍ≤ΩÏÇ¨???Ä??
                    </button>
                </header>

                <div className="p-8 space-y-8 max-w-5xl">

                    {/* Banners Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">ad_units</span>
                                Î©îÏù∏ Î∞∞ÎÑà Í¥ÄÎ¶?(?ÅÎã® ?¨Îùº?¥Îìú)
                            </h2>
                            <button onClick={addBanner} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                Î∞∞ÎÑà Ï∂îÍ?
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
                                        title="??†ú"
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
                                                <label className="text-xs text-slate-400 block mb-1">?úÍ∑∏ (Tag)</label>
                                                <input
                                                    type="text"
                                                    value={banner.tag}
                                                    onChange={(e) => handleBannerChange(banner.id, 'tag', e.target.value)}
                                                    className="w-full text-sm font-medium border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">ÎßÅÌÅ¨ (Link)</label>
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
                                            <label className="text-xs text-slate-400 block mb-1">?úÎ™© (Title)</label>
                                            <textarea
                                                value={banner.title}
                                                onChange={(e) => handleBannerChange(banner.id, 'title', e.target.value)}
                                                className="w-full text-sm font-bold border-slate-200 rounded px-2 py-1 whitespace-pre-wrap h-14 resize-none focus:ring-1 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Î∂Ä?úÎ™© (Subtitle)</label>
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
                                    ?±Î°ù??Î∞∞ÎÑàÍ∞Ä ?ÜÏäµ?àÎã§.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Icons Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">grid_view</span>
                                Î∞îÎ°úÍ∞ÄÍ∏??ÑÏù¥ÏΩ?Í¥ÄÎ¶?
                            </h2>
                            <button onClick={addLink} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                ?ÑÏù¥ÏΩ?Ï∂îÍ?
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
                                        title="??†ú"
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
                                            placeholder="?ºÎ≤®"
                                            onChange={(e) => handleLinkChange(link.id, 'label', e.target.value)}
                                            className="text-xs font-bold text-center w-full border-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                                        />
                                        <input
                                            type="text"
                                            value={link.path}
                                            placeholder="ÎßÅÌÅ¨"
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
                                ?¥Î≤§??Î∞∞ÎÑà Í¥ÄÎ¶?(Í∞ÄÎ°??§ÌÅ¨Î°?
                            </h2>
                            <button onClick={addEventBanner} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                ?¥Î≤§??Ï∂îÍ?
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
                                    <button onClick={() => deleteEventBanner(banner.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1" title="??†ú"><span className="material-symbols-outlined">delete</span></button>

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
                                                <label className="text-xs text-slate-400 block mb-1">Î∞∞Í≤Ω??(Image ?ÜÏùÑ ??</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={banner.backgroundColor} onChange={(e) => handleEventChange(banner.id, 'backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0" />
                                                    <input type="text" value={banner.backgroundColor} onChange={(e) => handleEventChange(banner.id, 'backgroundColor', e.target.value)} className="flex-1 text-xs border-slate-200 rounded px-2" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">?úÏãú ?ÑÏπò</label>
                                                <select
                                                    value={banner.location || 'all'}
                                                    onChange={(e) => handleEventChange(banner.id, 'location', e.target.value)}
                                                    className="w-full text-xs border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 outline-none"
                                                >
                                                    <option value="all">?ÑÏ≤¥ (??+ ?¨Ìñâ?ÅÌíà)</option>
                                                    <option value="home">???îÎ©¥Îß?/option>
                                                    <option value="products">?¨Ìñâ?ÅÌíà ?òÏù¥ÏßÄÎß?/option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">?úÍ∑∏</label>
                                                <input type="text" value={banner.tag} onChange={(e) => handleEventChange(banner.id, 'tag', e.target.value)} className="w-full text-xs font-bold border-slate-200 rounded px-2 py-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">ÎßÅÌÅ¨</label>
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
                                            <label className="text-xs text-slate-400 block mb-1">?úÎ™© (Ï§ÑÎ∞îÍø?Í∞Ä??</label>
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
                                ?¨ÌñâÏßÄ ?åÎßà Î∞∞ÎÑà Í¥ÄÎ¶?(???¥Î?ÏßÄ)
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
                                            <span className="text-white text-xs font-medium">?¥Î?ÏßÄ Î≥ÄÍ≤?/span>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                                        <div>
                                            <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">?úÎ™©</label>
                                            <input
                                                type="text"
                                                value={tab.title}
                                                onChange={(e) => handleCategoryChange(tab.id, 'title', e.target.value)}
                                                className="w-full text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 py-1 focus:border-teal-500 outline-none bg-transparent transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">Î∂Ä?úÎ™©</label>
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

                    {/* Custom Quote Banners Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">collections</span>
                                ÎßûÏ∂§Í≤¨Ï†Å Î∞∞ÎÑà Í¥ÄÎ¶?(?¨Ìñâ?ÅÌíà ?òÎã® ?¨Îùº?¥Îìú)
                            </h2>
                            <button onClick={addCustomQuoteBanner} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>
                                ?¥Î?ÏßÄ Ï∂îÍ?
                            </button>
                        </div>

                        <input type="file" ref={customQuoteFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'quote')} />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {customQuoteBanners.map((imageUrl, index) => (
                                <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2 group relative bg-slate-50/50 hover:bg-white transition-colors hover:shadow-sm overflow-hidden p-2">
                                    <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full z-10">#{index + 1}</div>
                                    <button
                                        onClick={() => deleteCustomQuoteBanner(index)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1 z-20 bg-white/80 rounded-full shadow-sm"
                                        title="??†ú"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                    <div className="absolute bottom-4 right-4 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveCustomQuoteBanner(index, 'left')} disabled={index === 0} className="p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 bg-white/90 rounded shadow text-xs"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                        <button onClick={() => moveCustomQuoteBanner(index, 'right')} disabled={index === customQuoteBanners.length - 1} className="p-1 text-slate-400 hover:text-teal-500 disabled:opacity-30 bg-white/90 rounded shadow text-xs"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                    </div>

                                    <div
                                        className="w-full aspect-[21/9] bg-slate-200 rounded-lg bg-cover bg-center shrink-0 relative group/img cursor-pointer border border-slate-200 text-slate-800"
                                        style={{ backgroundImage: imageUrl ? `url('${imageUrl}')` : 'none' }}
                                        onClick={() => { setSelectedQuoteIndex(index); setSelectedId(null); customQuoteFileInputRef.current?.click(); }}
                                    >
                                        {!imageUrl && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-1">add_photo_alternate</span>
                                                <span className="text-[10px] font-bold">?¥Î?ÏßÄ ?†ÌÉù</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {customQuoteBanners.length === 0 && (
                                <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                                    ?±Î°ù??ÎßûÏ∂§Í≤¨Ï†Å ?¨Îùº?¥Îìú ?¥Î?ÏßÄÍ∞Ä ?ÜÏäµ?àÎã§.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-in z-[100]">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <span className="font-bold text-sm">?Ä?•Îêò?àÏäµ?àÎã§!</span>
                </div>
            )}
        </div>
    );
};
