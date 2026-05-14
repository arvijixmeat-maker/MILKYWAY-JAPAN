import React from 'react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
    activePage: string;
    title: string;
    description?: string;
    isDarkMode: boolean;
    toggleTheme: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
    activePage,
    title,
    description,
    isDarkMode,
    toggleTheme,
    actions,
    children,
}) => {
    return (
        <div className="flex min-h-screen bg-[#f6f8fb] font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <AdminSidebar activePage={activePage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex min-h-screen flex-1 flex-col">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-8 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                Admin Console
                            </div>
                            <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {description}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            {actions}
                            <div className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white">관리자</p>
                                    <p className="text-[11px] text-slate-400">운영 계정</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="mx-auto w-full max-w-[1600px] flex-1 px-8 py-7">
                    {children}
                </div>
            </main>
        </div>
    );
};
