import React from 'react';
import { Search } from 'lucide-react';

/** 화면 안 구역 머리 (제목 20/16px · 설명 · 오른쪽 버튼). 페이지 제목(28px)은 AdminLayout 이 그린다. */
export const PageHeader: React.FC<{ title: string; description?: React.ReactNode; level?: 2 | 3; actions?: React.ReactNode }> = ({
    title, description, level = 2, actions,
}) => {
    const H = level === 2 ? 'h2' : 'h3';
    return (
        <div className="sec-head">
            <div className="sec-titles">
                <H className={level === 2 ? 'sec-h2' : 'sec-h3'}>{title}</H>
                {description && <p>{description}</p>}
            </div>
            {actions && <div className="header-tools">{actions}</div>}
        </div>
    );
};

/** 흰 카드 (헤어라인 · 라운드 12px · 그림자 없음). `title` 을 주면 머리줄이 생긴다. */
export const Card: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
    title, action, className = '', children,
}) => (
    <section className={`card card-clip ${className}`.trim()}>
        {title && (
            <div className="card-head">
                <h2>{title}</h2><div className="spacer" />
                {action}
            </div>
        )}
        {children}
    </section>
);

/** 목록 위 필터 줄 — 검색 · 선택 · 칩을 한 줄에. 좁으면 줄바꿈. */
export const FilterBar: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`filterbar ${className}`.trim()}>{children}</div>
);

/** 필터 줄의 검색창 */
export const SearchInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & { label?: string; width?: number | string }> = ({
    label = '검색', width, ...rest
}) => (
    <label className="tb-search" style={width ? { width, maxWidth: '100%' } : undefined}>
        <Search size={18} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <input type="search" {...rest} />
    </label>
);

export interface ChipOption<V extends string = string> { value: V; label: string; count?: number }

/** 단계 필터 — 알약 칩. 768px 이하에서는 가로로 밀어서 본다. */
export function ChipFilter<V extends string>({ options, value, onChange, label }: {
    options: ChipOption<V>[]; value: V; onChange: (value: V) => void; label?: string;
}) {
    return (
        <div className="chip-row" role="group" aria-label={label}>
            {options.map((o) => (
                <button key={o.value} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
                    {o.label}{typeof o.count === 'number' && <span className="ct">{o.count}</span>}
                </button>
            ))}
        </div>
    );
}

export interface TabOption<V extends string = string> { value: V; label: string; count?: number; icon?: React.ReactNode }

/** 밑줄 탭 (상세 화면) */
export function Tabs<V extends string>({ tabs, value, onChange, label }: {
    tabs: TabOption<V>[]; value: V; onChange: (value: V) => void; label?: string;
}) {
    return (
        <div className="tabs" role="tablist" aria-label={label}>
            {tabs.map((t) => (
                <button key={t.value} type="button" role="tab" className="tab" aria-selected={t.value === value} onClick={() => onChange(t.value)}>
                    {t.icon}{t.label}{typeof t.count === 'number' && t.count > 0 && <span className="dtab-ct">{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

/** KPI 카드 — 아이콘 + 이름 / 숫자 28px / 보조 설명. `href` 를 주면 누를 수 있다. */
export const KpiCard: React.FC<{
    icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
    tone?: 'gray' | 'green' | 'red' | 'accent'; href?: string; loading?: boolean;
}> = ({ icon, label, value, sub, tone = 'gray', href, loading }) => {
    const inner = (
        <>
            <div className="kpi-top"><span className={`kpi-ico${tone === 'gray' ? '' : ` t-${tone}`}`}>{icon}</span><span className="kpi-label">{label}</span></div>
            <div className="kpi-value">{loading ? <span className="sk sk-value" /> : value}</div>
            <div className="kpi-sub">{loading ? '' : sub}</div>
        </>
    );
    return href ? <a className="kpi" href={href}>{inner}</a> : <div className="kpi">{inner}</div>;
};

/** 빈 상태 — 아이콘 · 한 줄 설명 · (선택) 버튼 */
export const EmptyState: React.FC<{ icon?: React.ReactNode; small?: boolean; action?: React.ReactNode; children: React.ReactNode }> = ({
    icon, small, action, children,
}) => (
    <div className={`empty${small ? ' sm' : ''}`}>
        {icon}
        <p>{children}</p>
        {action}
    </div>
);

/** 안내 띠 — 기본은 연녹색 정보, `error` 는 빨간 테두리 */
export const Notice: React.FC<{ icon?: React.ReactNode; error?: boolean; action?: React.ReactNode; children: React.ReactNode }> = ({
    icon, error, action, children,
}) => (
    <div className={`note${error ? ' error' : ''}`} role={error ? 'alert' : undefined}>
        {icon}<span>{children}</span>{action}
    </div>
);
