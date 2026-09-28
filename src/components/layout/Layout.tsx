import React from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopLayout } from '../layout-desktop/DesktopLayout';
import { MobileHeader } from '../home-mobile/MobileHeader';
import { MobileFooter } from '../home-mobile/MobileFooter';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const isDesktop = useIsDesktop();

    // Desktop: render PC shell (DesktopHeader + content + DesktopFooter).
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
            <MobileHeader />
            <main className="max-w-[480px] mx-auto min-h-screen bg-white">
                {children}
                <MobileFooter />
            </main>
            {!shouldHideBottomNav && <BottomNav />}
        </div>
    );
};
