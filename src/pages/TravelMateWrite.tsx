import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import { useTranslation } from 'react-i18next';

export const TravelMateWrite: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [count, setCount] = useState(4);
    const [gender, setGender] = useState('any');
    const [selectedAges, setSelectedAges] = useState<string[]>(['30s']);
    const [selectedRegion, setSelectedRegion] = useState('central_mongolia');
    const [styles, setStyles] = useState<string[]>(['healing']);
    const [image, setImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const regions = [
        { key: 'central_mongolia', label: 'travel_mates.tabs.central_mongolia' },
        { key: 'gobi_desert', label: 'travel_mates.tabs.gobi_desert' },
        { key: 'khuvsgul', label: 'travel_mates.tabs.khuvsgul' },
        { key: 'trekking', label: 'travel_mates.tabs.trekking' },
        { key: 'golf', label: 'travel_mates.tabs.golf' }
    ];

    const toggleAge = (age: string) => {
        if (selectedAges.includes(age)) {
            setSelectedAges(selectedAges.filter(a => a !== age));
        } else {
            setSelectedAges([...selectedAges, age]);
        }
    };

    const toggleStyle = (style: string) => {
        if (styles.includes(style)) {
            setStyles(styles.filter(s => s !== style));
        } else {
            setStyles([...styles, style]);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await uploadImage(file, 'travel-mates');
                setImage(url);
            } catch (error) {
                alert(t('travel_mates.write.image_upload_fail', { defaultValue: 'Failed to upload image' }));
            }
        }
    };

    const calculateDuration = (start: string, end: string): string => {
        if (!start || !end) return '';
        const startD = new Date(start);
        const endD = new Date(end);
        const diffTime = Math.abs(endD.getTime() - startD.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '1 Day';
        return `${diffDays}${t('travel_mates.detail.nights', { defaultValue: 'N' })} ${diffDays + 1}${t('travel_mates.detail.days', { defaultValue: 'D' })}`;
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}.${date.getDate()}`;
    };

    const generateTags = (): string[] => {
        const tags: string[] = [];
        if (selectedRegion) tags.push(`#${t(`travel_mates.tabs.${selectedRegion}`)}`);

        styles.forEach(style => {
            tags.push(`#${t(`travel_mates.filters.style_${style}`).replace(/^[^\w가-힣]+/, '').trim()}`);
        });
        return tags.slice(0, 4);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            alert(t('travel_mates.write.alert_title'));
            return;
        }
        if (!startDate) {
            alert(t('travel_mates.write.alert_date'));
            return;
        }
        if (!description.trim()) {
            alert(t('travel_mates.write.alert_desc'));
            return;
        }

        setIsSubmitting(true);
        try {
            const me = await api.auth.me();

            const newPost = {
                user_id: me?.id,
                title: title.trim(),
                description: description.trim(),
                start_date: formatDate(startDate),
                end_date: endDate ? formatDate(endDate) : formatDate(startDate),
                duration: calculateDuration(startDate, endDate || startDate),
                recruit_count: count,
                gender: gender,
                age_groups: selectedAges,
                region: t(`travel_mates.tabs.${selectedRegion}`),
                // Saving translated string for now as discussed to maintain compatibility with existing "Korean" data patterns
                // or ideally we start saving keys, but list view expects strings matching tabs.
                // The list view filters by `post.region.includes(tabLabel)`.
                // So if we save the translated label, it works for that language. 
                // But cross-language might be tricky. For now, assuming single-language context per user or "Korean" main.
                // Actually, `selectedRegion` state is now 'central_mongolia' key.
                // so `t(...)` will return "중앙몽골" (if KR) or "Central Mongolia" (if JA).

                styles: styles.map(s => t(`travel_mates.filters.style_${s}`)),
                tags: generateTags(),
                image: image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
                author_name: me?.user_metadata?.name || 'Anonymous',
                author_image: me?.user_metadata?.avatar_url || 'https://via.placeholder.com/100',
                author_info: `Traveler`, // Simplified
                status: 'recruiting',
                view_count: 0,
                comment_count: 0
            };

            await api.travelMates.create(newPost);

            alert(t('travel_mates.write.success'));
            navigate('/travel-mates');
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to create post');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen">
            <div className="relative min-h-screen max-w-md mx-auto bg-white dark:bg-[#12201d] shadow-xl overflow-hidden flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-white/90 dark:bg-[#12201d]/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/50">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('travel_mates.post.write_button')}</h1>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 -mr-2 text-gray-500 rounded-full hover:bg-background-light dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                    {/* Image Upload */}
                    <div className="px-5 pt-6 pb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1">{t('travel_mates.write.image_label')}</label>
                        <div
                            className="relative w-full h-40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center cursor-pointer overflow-hidden group"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            {image ? (
                                <>
                                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-medium">{t('travel_mates.write.image_upload_btn')}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-4xl text-gray-400">add_photo_alternate</span>
                                    <p className="text-xs text-gray-500 mt-1">{t('travel_mates.write.image_upload_desc')}</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Title Input */}
                    <div className="px-5 pb-6">
                        <label className="sr-only" htmlFor="post-title">{t('travel_mates.write.title_label')}</label>
                        <textarea
                            className="w-full text-[22px] font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent border-none focus:ring-0 p-0 resize-none leading-tight"
                            id="post-title"
                            placeholder={t('travel_mates.write.title_placeholder')}
                            rows={2}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="h-3 bg-background-light dark:bg-black/20"></div>

                    {/* Schedule */}
                    <div className="px-5 py-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('travel_mates.write.period_label')}</h2>
                        <div className="flex gap-3 mb-4">
                            {/* Start Date */}
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">{t('travel_mates.write.start_date')}</label>
                                <div className="relative group">
                                    <input
                                        className="w-full bg-background-light dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-xl border-none focus:ring-2 focus:ring-primary/50 py-3.5 pl-10 pr-4"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[20px]">calendar_today</span>
                                </div>
                            </div>
                            {/* End Date */}
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">{t('travel_mates.write.end_date')}</label>
                                <div className="relative group">
                                    <input
                                        className="w-full bg-background-light dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-xl border-none focus:ring-2 focus:ring-primary/50 py-3.5 pl-4 pr-4"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Region Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1">{t('travel_mates.write.region_label')}</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
                                {regions.map((region) => (
                                    <button
                                        key={region.key}
                                        onClick={() => setSelectedRegion(region.key)}
                                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${selectedRegion === region.key
                                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                                            : 'bg-background-light dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {t(region.label)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-3 bg-background-light dark:bg-black/20"></div>

                    {/* Recruitment Conditions */}
                    <div className="px-5 py-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t('travel_mates.write.count_label')}</h2>
                        {/* Count */}
                        <div className="flex items-center justify-between mb-6 p-4 bg-background-light dark:bg-gray-800/50 rounded-2xl">
                            <div>
                                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t('travel_mates.write.count_label')}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('travel_mates.post.person_count', { count: count })}</span>
                            </div>
                            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setCount(Math.max(1, count - 1))}
                                    disabled={count <= 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[20px]">remove</span>
                                </button>
                                <span className="text-lg font-bold text-gray-900 dark:text-white w-4 text-center">{count}</span>
                                <button
                                    onClick={() => setCount(count + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-primary shadow-sm hover:bg-primary/90 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                </button>
                            </div>
                        </div>
                        {/* Gender */}
                        <div className="mb-5">
                            <p className="text-sm font-semibold text-gray-500 mb-2 ml-1">{t('travel_mates.write.gender_label')}</p>
                            <div className="flex w-full bg-background-light dark:bg-gray-800 p-1 rounded-xl">
                                {['any', 'male', 'female'].map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGender(g)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${gender === g
                                            ? 'bg-white dark:bg-gray-700 text-primary dark:text-white font-bold shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        {t(`travel_mates.filters.gender_${g}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Age */}
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-2 ml-1">{t('travel_mates.write.age_label')}</p>
                            <div className="flex flex-wrap gap-2">
                                {['20s', '30s', '40s', '50s_plus'].map((age) => (
                                    <button
                                        key={age}
                                        onClick={() => toggleAge(age)}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${selectedAges.includes(age)
                                            ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                            : 'bg-background-light dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {t(`travel_mates.filters.age_${age}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-3 bg-background-light dark:bg-black/20"></div>

                    {/* Travel Style */}
                    <div className="px-5 py-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('travel_mates.write.style_label')}</h2>
                        <div className="flex flex-wrap gap-2.5">
                            {['healing', 'photo', 'activity', 'food', 'camping'].map((style) => (
                                <button
                                    key={style}
                                    onClick={() => toggleStyle(style)}
                                    className={`px-4 py-2.5 rounded-full font-medium text-sm border transition-all ${styles.includes(style)
                                        ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                                        : 'bg-background-light dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {t(`travel_mates.filters.style_${style}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="px-5 py-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('travel_mates.write.description_label')}</h2>
                        <textarea
                            className="w-full h-48 p-4 bg-background-light dark:bg-gray-800 rounded-xl border-none focus:ring-1 focus:ring-primary placeholder:text-gray-400 resize-none text-base leading-relaxed"
                            placeholder={t('travel_mates.write.description_placeholder')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                </main>

                {/* Fixed Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent dark:from-[#12201d] dark:via-[#12201d] pt-10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-primary text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                <span>{t('travel_mates.write.submitting')}</span>
                            </>
                        ) : (
                            <span>{t('travel_mates.write.submit_btn')}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
