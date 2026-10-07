import type { ReactNode } from 'react';
import './legalDoc.css';

/**
 * Document layout for 利用規約 / プライバシーポリシー (Claude Design: Info "isDoc" body):
 * a meta bar and one bordered card per article. The article text itself is passed in untouched;
 * paragraphs, lists and links inside are styled by legalDoc.css.
 */
export function LegalDoc({ effective, compact = false, children }: { effective: string; compact?: boolean; children: ReactNode }) {
    return (
        <div className={compact ? 'mw-legal mw-legal--m' : 'mw-legal'}>
            <div className="mw-legal__meta">
                <span>{effective}</span>
                <span>Milkyway Japan（Mongolia Milky Way / SUUN ZAM）</span>
            </div>
            {children}
        </div>
    );
}

export function LegalArticle({ no, title, children }: { no: string; title: string; children: ReactNode }) {
    return (
        <section className="mw-legal__art">
            <h2 className="mw-legal__head">
                <span className="mw-legal__no" aria-hidden="true">{no}</span>
                <span>{title}</span>
            </h2>
            <div className="mw-legal__body">{children}</div>
        </section>
    );
}
