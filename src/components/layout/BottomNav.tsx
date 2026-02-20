import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav
            className="fixed bottom-0 left-0 w-full bg-white dark:bg-background-dark shadow-none drop-shadow-none pb-safe pt-2 px-6 z-50 h-[84px]"
            style={{ boxShadow: 'none !important', border: 'none !important' }}
        >
            <div className="flex justify-between items-center max-w-md mx-auto h-full">
                <button
                    onClick={() => navigate('/')}
                    className={`flex flex-col items-center justify-center gap-1 ${isActive('/') ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/') ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                    <span className="text-[10px] font-bold">{t('nav.home')}</span>
                </button>
                <button
                    onClick={() => navigate('/products')}
                    className={`flex flex-col items-center justify-center gap-1 ${isActive('/products') ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/products') ? "'FILL' 1" : "'FILL' 0" }}>inventory_2</span>
                    <span className="text-[10px] font-bold">{t('nav.products')}</span>
                </button>
                <button
                    onClick={() => navigate('/travel-mates')}
                    className={`flex flex-col items-center justify-center gap-1 ${isActive('/travel-mates') ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/travel-mates') ? "'FILL' 1" : "'FILL' 0" }}>group</span>
                    <span className="text-[10px] font-bold">{t('nav.travel_mates')}</span>
                </button>
                <button
                    onClick={() => navigate('/custom-estimate')}
                    className={`flex flex-col items-center justify-center gap-1 ${isActive('/custom-estimate') ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/custom-estimate') ? "'FILL' 1" : "'FILL' 0" }}>calculate</span>
                    <span className="text-[10px] font-bold">{t('nav.custom_estimate')}</span>
                </button>
                <button
                    onClick={() => navigate('/mypage')}
                    className={`flex flex-col items-center justify-center gap-1 ${isActive('/mypage') ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/mypage') ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                    <span className="text-[10px] font-bold">{t('nav.my_page')}</span>
                </button>
            </div>
        </nav>
    );
};
