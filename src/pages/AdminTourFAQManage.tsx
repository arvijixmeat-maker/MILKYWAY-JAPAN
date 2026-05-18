import React, { useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { TourFAQEditor } from '../components/admin/TourFAQEditor';

/**
 * Standalone page that hosts only the Tour Common FAQ editor. Kept so old
 * bookmarks of /admin/tour-faqs continue to work — the primary entry point
 * now lives as a tab inside /admin/faq.
 */
export const AdminTourFAQManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const toggleTheme = () => {
        setIsDarkMode((v) => !v);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar activePage="faq" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">투어 공통 FAQ</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            모든 상품 상세 페이지 하단에 공통으로 표시됩니다. 「FAQ 관리」&rarr;「투어 공통 FAQ」 탭에서도 동일하게 편집 가능합니다.
                        </p>
                    </div>
                </header>

                <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
                    <TourFAQEditor />
                </div>
            </main>
        </div>
    );
};

export default AdminTourFAQManage;
