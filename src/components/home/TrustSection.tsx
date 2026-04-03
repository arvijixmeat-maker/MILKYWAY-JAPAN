import React from 'react';
import { useTranslation } from 'react-i18next';

export const TrustSection: React.FC = () => {
    const { t } = useTranslation();

    const trustItems = [
        {
            icon: 'g_translate',
            title: t('home.magazine.trust.item1_title', { defaultValue: '1. 日本語完全対応' }),
            desc: t('home.magazine.trust.item1_desc', { defaultValue: '日本語堪能な専門ガイド이 동행하여 의사소통 걱정 없이 안심하고 여행할 수 있습니다.' })
        },
        {
            icon: 'support_agent',
            title: t('home.magazine.trust.item2_title', { defaultValue: '2. 24時間サポート' }),
            desc: t('home.magazine.trust.item2_desc', { defaultValue: '旅行中の緊急時も、日本語チャットで24時間迅速に対応いたします' })
        },
        {
            icon: 'restaurant',
            title: t('home.magazine.trust.item3_title', { defaultValue: '3. 日本人向けの食事対応' }),
            desc: t('home.magazine.trust.item3_desc', { defaultValue: '衛生管理を徹底し、日本人の口に合う美味しいモンゴル料理をご提案します。' })
        },
        {
            icon: 'verified_user',
            title: t('home.magazine.trust.item4_title', { defaultValue: '4. 安全第一の車両관리' }),
            desc: t('home.magazine.trust.item4_desc', { defaultValue: '定期点検をパスした安全な車両のみを使用し、快適な移動を保証します' })
        }
    ];

    return (
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-5">
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4">
                        {t('home.magazine.trust.title', { defaultValue: 'Milkyway Japanが選ばれる理由' })}
                    </h2>
                    <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trustItems.map((item, index) => (
                        <div 
                            key={index} 
                            className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                        >
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                                <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 break-keep">
                                {item.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed break-keep">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
