import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logoHorizontal from '../../assets/logo_horizontal.webp';

const PHONE_PRIMARY = '+976 9594 5838';
const EMAIL = 'bolor1@hanmail.net';
const ADDRESS_QUERY = 'Mongolia Milky Way, DACO Center, Bayanzurkh, Ulaanbaatar';

export const Footer: React.FC = () => {
    const { t } = useTranslation();
    const [showInfo, setShowInfo] = useState(false);

    return (
        <footer className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-8 pb-10 px-6">

            {/* Brand */}
            <div className="flex flex-col items-center mb-6">
                <img
                    src={logoHorizontal}
                    alt="Milkyway Japan"
                    className="h-8 object-contain mb-2 opacity-90"
                    loading="lazy"
                    decoding="async"
                />
                <p className="text-[12px] text-slate-500 dark:text-slate-400 tracking-wide">
                    {t('footer.tagline')}
                </p>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col gap-2.5 mb-7">
                <a
                    href="https://jzz1k.channel.io/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#06C755] text-white font-bold text-[14px] shadow-sm hover:bg-[#05b04b] active:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                    {t('footer.kakao_inquiry')}
                </a>
                <a
                    href={`mailto:${EMAIL}`}
                    className="w-full flex flex-col items-center justify-center py-2.5 px-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary/50 active:scale-[0.98] transition-all"
                >
                    <span className="text-[13px] font-bold">{t('footer.partnership_label')}</span>
                    <span className="text-[12px] text-primary font-medium mt-0.5 tabular-nums">{EMAIL}</span>
                </a>
            </div>

            {/* Quick Contact Icons */}
            <div className="mb-7">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase text-center mb-2.5">
                    {t('footer.contact_heading')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                    <QuickAction icon="call" label="Call" href={`tel:${PHONE_PRIMARY.replace(/\s/g, '')}`} />
                    <QuickAction icon="mail" label="Email" href={`mailto:${EMAIL}`} />
                    <QuickAction
                        icon="location_on"
                        label="Map"
                        href={`https://maps.google.com/?q=${encodeURIComponent(ADDRESS_QUERY)}`}
                        external
                    />
                </div>
            </div>

            {/* Services (SEO internal links) */}
            <div className="mb-7">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase text-center mb-3">
                    {t('footer.services_heading')}
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                    <ServiceLink href="/travel-guide">モンゴル旅行ガイド</ServiceLink>
                    <ServiceLink href="/products">モンゴルツアー比較</ServiceLink>
                    <ServiceLink href="/category/horse-riding-tour">モンゴル乗馬旅行</ServiceLink>
                    <ServiceLink href="/category/gobi-desert">ゴビ砂漠ツアー</ServiceLink>
                    <ServiceLink href="/products" className="col-span-2">モンゴルツアー商品一覧</ServiceLink>
                </div>
            </div>

            {/* Social */}
            <div className="mb-7">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase text-center mb-3">
                    {t('footer.sns_heading')}
                </p>
                <div className="flex justify-center gap-3">
                    <SocialIcon
                        href="https://www.instagram.com/milkyway_mongolia"
                        label="Instagram"
                        src="/assets/icons/instagram.webp"
                    />
                    <SocialIcon
                        href="https://line.me/ti/p/2mQyucsGcT"
                        label="LINE"
                        src="/assets/icons/line.webp"
                    />
                </div>
            </div>

            {/* Collapsible Company Info */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all"
                    aria-expanded={showInfo}
                >
                    <span className="leading-none">
                        {showInfo ? t('footer.hide_info') : t('footer.show_info')}
                    </span>
                    <span
                        className={`material-symbols-outlined text-[18px] leading-none transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`}
                    >
                        expand_more
                    </span>
                </button>

                {showInfo && (
                    <div className="mt-5 space-y-5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">

                        {/* Legal Links */}
                        <div className="flex items-center justify-center divide-x divide-slate-300 dark:divide-slate-700 text-[12px] font-semibold">
                            <a href="/about" className="px-3 hover:text-primary transition-colors">会社案内</a>
                            <a href="/terms-of-service" className="px-3 hover:text-primary transition-colors">{t('footer.terms_of_service')}</a>
                            <a href="/privacy-policy" className="px-3 hover:text-primary transition-colors">{t('footer.privacy_policy')}</a>
                        </div>

                        {/* Office Info */}
                        <OfficeBlock
                            title={t('footer.mongolia_office')}
                            lines={[
                                t('footer.mongolia_office_info_1'),
                                t('footer.mongolia_office_info_2'),
                                t('footer.mongolia_office_info_3'),
                                t('footer.mongolia_office_info_4'),
                            ]}
                        />
                        <OfficeBlock
                            title={t('footer.korea_office')}
                            lines={[
                                t('footer.korea_office_info_1'),
                                t('footer.korea_office_info_2'),
                                t('footer.korea_office_info_3'),
                                t('footer.korea_office_info_4'),
                            ]}
                        />

                        {/* Disclaimer */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 leading-[1.6] space-y-1.5">
                            <p>{t('footer.disclaimer_1')}</p>
                            <p>{t('footer.disclaimer_2')}</p>
                            <p>{t('footer.disclaimer_3')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Copyright */}
            <div className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                © {new Date().getFullYear()} Mongolia Milky Way. All rights reserved.
            </div>
        </footer>
    );
};

// — Subcomponents —

const QuickAction: React.FC<{
    icon: string;
    label: string;
    href: string;
    external?: boolean;
}> = ({ icon, label, href, external }) => (
    <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:shadow-sm active:scale-95 transition-all"
    >
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
        </span>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
            {label}
        </span>
    </a>
);

const ServiceLink: React.FC<{
    href: string;
    className?: string;
    children: React.ReactNode;
}> = ({ href, className = '', children }) => (
    <a
        href={href}
        className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors ${className}`}
    >
        <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
        <span className="truncate">{children}</span>
    </a>
);

const SocialIcon: React.FC<{ href: string; label: string; src: string }> = ({ href, label, src }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-110 hover:border-primary/40 transition-all"
    >
        <img
            src={src}
            alt={label}
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
            loading="lazy"
            decoding="async"
        />
    </a>
);

const OfficeBlock: React.FC<{ title: string; lines: string[] }> = ({ title, lines }) => (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h3 className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-[12.5px] mb-2.5">
            <span className="w-1 h-3.5 bg-primary rounded-full" />
            {title}
        </h3>
        <div className="space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400 leading-[1.65]">
            {lines.map((line, i) => (
                <p key={i}>{line}</p>
            ))}
        </div>
    </div>
);
