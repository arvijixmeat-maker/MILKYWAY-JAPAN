import React from 'react';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
    const { t } = useTranslation();

    return (
        <footer className="px-6 pt-6 pb-24 bg-slate-50 text-slate-500">

            {/* Contact Buttons */}
            <div className="flex flex-col gap-3 mb-6 items-center">
                <a
                    href="https://pf.kakao.com/_BSLaxl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs flex items-center justify-center gap-2 py-3 px-6 bg-[#E8EFF5] rounded-full text-slate-700 font-bold text-sm hover:bg-[#dbe6f0] transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                    {t('footer.kakao_inquiry')}
                </a>
                <a
                    href="mailto:bolor1@hanmail.net"
                    className="w-full max-w-xs flex items-center justify-center gap-2 py-3 px-6 bg-[#E8EFF5] rounded-full text-slate-700 font-bold text-sm hover:bg-[#dbe6f0] transition-colors"
                >
                    {t('footer.partnership_inquiry')}
                </a>
            </div>

            {/* Social Icons */}
            <div className="flex justify-center gap-4 mb-6">
                {/* Instagram */}
                <a href="https://www.instagram.com/mongolia_inhasu/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-110">
                    <img src="/assets/icons/instagram.png" alt="Instagram" className="w-full h-full object-contain" />
                </a>
                {/* Naver Blog */}
                <a href="https://blog.naver.com/tulgabolor2" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#2DB400] flex items-center justify-center text-white hover:opacity-90 transition-all font-bold text-lg font-serif">
                    N
                </a>
                {/* KakaoTalk */}
                <a href="https://pf.kakao.com/_BSLaxl" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-110">
                    <img src="/assets/icons/kakaotalk.png" alt="KakaoTalk" className="w-full h-full object-contain" />
                </a>
                {/* Facebook */}
                <a href="https://www.facebook.com/mongoliasky.co.kr/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-110">
                    <img src="/assets/icons/facebook.png" alt="Facebook" className="w-full h-full object-contain" />
                </a>
            </div>

            <div className="h-px bg-slate-200 mb-6 w-full"></div>

            {/* Business Info */}
            <div className="space-y-4 text-[11px] leading-relaxed relative">

                {/* Legal Links */}
                <div className="flex gap-3 mb-2 font-semibold">
                    <a href="/terms-of-service" className="hover:text-slate-800">{t('footer.terms_of_service')}</a>
                    <span className="text-slate-300">|</span>
                    <a href="/privacy-policy" className="hover:text-slate-800">{t('footer.privacy_policy')}</a>
                </div>

                {/* Mongolia Office */}
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-700 mb-2 text-xs">{t('footer.mongolia_office')}</h3>
                    <p>{t('footer.mongolia_office_info_1')}</p>
                    <p>{t('footer.mongolia_office_info_2')}</p>
                    <p>{t('footer.mongolia_office_info_3')}</p>
                    <p>{t('footer.mongolia_office_info_4')}</p>
                </div>

                {/* Korea Office */}
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-700 mb-2 text-xs">{t('footer.korea_office')}</h3>
                    <p>{t('footer.korea_office_info_1')}</p>
                    <p>{t('footer.korea_office_info_2')}</p>
                    <p>{t('footer.korea_office_info_3')}</p>
                    <p>{t('footer.korea_office_info_4')}</p>
                </div>

                <div className="h-px bg-slate-200 my-4 w-full"></div>

                {/* Disclaimer */}
                <div className="text-[10px] text-slate-400 leading-normal">
                    <p className="mb-2">{t('footer.disclaimer_1')}</p>
                    <p className="mb-2">{t('footer.disclaimer_2')}</p>
                    <p>{t('footer.disclaimer_3')}</p>
                </div>

            </div>
        </footer>
    );
};
