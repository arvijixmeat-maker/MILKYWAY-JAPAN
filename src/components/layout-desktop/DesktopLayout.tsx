import type { ReactNode } from 'react';
import { DesktopHeader } from './DesktopHeader';
import { DesktopFooter } from './DesktopFooter';

interface DesktopLayoutProps {
    children: ReactNode;
    contentWidth?: number;
}

export function DesktopLayout({ children, contentWidth = 1280 }: DesktopLayoutProps) {
    return (
        <div style={{ minHeight: '100vh', background: '#fff', color: 'var(--fg-2)' }}>
            <DesktopHeader contentWidth={contentWidth} />
            <main>{children}</main>
            <DesktopFooter contentWidth={contentWidth} />
        </div>
    );
}
