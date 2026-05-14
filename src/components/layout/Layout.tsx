import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { DesktopLayout } from '../layout-desktop/DesktopLayout';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const isDesktop = useIsDesktop();

    // Desktop: render PC shell (DesktopHeader + content + DesktopFooter).
    // Below 1024px: existing mobile shell unchanged.
    if (isDesktop) {
        return <DesktopLayout>{children}</DesktopLayout>;
    }

    // Hide BottomNav on product detail and reservation pages
    const hideBottomNavPages = [
        '/products/',
        '/reservation/',
        '/order/'
    ];

    const shouldHideBottomNav = hideBottomNavPages.some(path => location.pathname.includes(path));

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display selection:bg-primary/20">
            <Header />
            <main className="max-w-md mx-auto min-h-screen">
                {children}
                <Footer />
            </main>
            {!shouldHideBottomNav && <BottomNav />}
        </div>
    );
};
