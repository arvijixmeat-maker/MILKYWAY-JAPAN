import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { Icon } from './console/Icon';
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ADMIN_OPERATION_FLOW } from './adminNavigation';
import '../../styles/admin-console.css';

interface AdminLayoutProps {
    activePage: string;
    title: string;
    description?: string;
    /** small uppercase label above the title; defaults from the page section */
    eyebrow?: string;
    /** show the decorative header search pill (default true) */
    showSearch?: boolean;
    /** kept for backward-compat with existing call sites; redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

const EYEBROW: Record<string, string> = {
    dashboard: '관리자 콘솔',
    reservations: '예약 운영', quotes: '예약 운영', calendar: '예약 운영', guides: '예약 운영', 'accommodation-ops': '예약 운영',
    products: '카탈로그',
    magazines: '콘텐츠', templates: '상품·자료', reviews: '콘텐츠', faq: '콘텐츠', 'tour-faqs': '콘텐츠',
    banners: '사이트 설정', categories: '사이트 설정', hotels: '상품·자료', accommodations: '상품·자료',
    'tourist-spots': '상품·자료', 'design-spots': '상품·자료', 'guide-intro': '콘텐츠',
};

const PAGE_DESCRIPTION: Record<string, string> = {
    dashboard: '오늘 처리할 업무와 주요 운영 현황을 한눈에 확인하세요.',
    reservations: '예약·견적·배정 업무를 한 곳에서 빠르게 처리하세요.',
    quotes: '문의 확인부터 견적 작성, 고객 발송과 예약 전환까지 이어서 처리하세요.',
    'accommodation-ops': '여행 일정별 숙소 배정 상태와 객실 정보를 관리하세요.',
    calendar: '확정된 투어 일정과 운영 준비 상태를 확인하세요.',
    guides: '가이드의 승인 상태, 언어, 전문 분야와 연락처를 관리하세요.',
    products: '판매 상품과 노출 상태를 일관되게 관리하세요.',
    magazines: '여행 콘텐츠의 작성과 공개 상태를 관리하세요.',
    templates: '반복 업무에 사용하는 문서 템플릿을 관리하세요.',
    reviews: '고객 후기의 검수와 노출 상태를 관리하세요.',
    faq: '고객이 자주 찾는 질문과 답변을 관리하세요.',
    'tour-faqs': '상품별로 달라지는 질문과 답변을 관리하세요.',
    banners: '고객이 처음 보는 홈 화면의 배너와 바로가기를 관리하세요.',
    categories: '상품 분류와 고객 화면의 노출 순서를 관리하세요.',
    hotels: '상품과 일정표에서 다시 사용하는 호텔 정보를 관리하세요.',
    accommodations: '게르와 캠프 등 숙소 리소스를 관리하세요.',
    'tourist-spots': '상품 일정에 사용하는 관광지 정보를 관리하세요.',
    'design-spots': '상품 상세페이지에서 사용하는 여행지 사진을 관리하세요.',
    'guide-intro': '확정일정표에 공통으로 들어가는 일본어 안내를 관리하세요.',
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
    activePage, title, description, eyebrow, showSearch = true, actions, children,
}) => {
    const navigate = useNavigate();
    const [isNavigationOpen, setIsNavigationOpen] = useState(false);
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const commandInputRef = useRef<HTMLInputElement>(null);
    const eb = eyebrow || EYEBROW[activePage] || '관리자 콘솔';
    const pageDescription = description || PAGE_DESCRIPTION[activePage];
    const showWorkflow = ADMIN_OPERATION_FLOW.some((item) => item.id === activePage);

    const commandResults = useMemo(() => {
        const query = commandQuery.trim().toLowerCase();
        if (!query) return ADMIN_NAV_ITEMS.slice(0, 8);
        return ADMIN_NAV_ITEMS.filter((item) => (
            [item.label, item.description, ...(item.keywords || [])]
                .join(' ')
                .toLowerCase()
                .includes(query)
        )).slice(0, 10);
    }, [commandQuery]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandOpen((value) => !value);
            }
            if (event.key === 'Escape') setIsCommandOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!isCommandOpen) return;
        const frame = window.requestAnimationFrame(() => commandInputRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [isCommandOpen]);

    const handleCommandSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const first = commandResults[0];
        setIsCommandOpen(false);
        if (first) navigate(first.href);
        else if (commandQuery.trim()) navigate(`/admin/reservations?q=${encodeURIComponent(commandQuery.trim())}`);
    };

    return (
        <div className={`app${isNavigationOpen ? ' side-open' : ''}`}>
            <AdminSidebar activePage={activePage} onNavigate={() => setIsNavigationOpen(false)} />
            <button
                className="side-scrim"
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setIsNavigationOpen(false)}
            />
            <div className="main">
                <header className="header">
                    <div className="header-in">
                        <button
                            className="icon-btn mobile-nav-btn"
                            type="button"
                            aria-label="관리자 메뉴 열기"
                            aria-expanded={isNavigationOpen}
                            onClick={() => setIsNavigationOpen(true)}
                        >
                            <Icon name="menu" />
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <div className="eyebrow"><span className="dot" />{eb}</div>
                            <div className="page-title">{title}</div>
                            {pageDescription && (
                                <div className="page-description">{pageDescription}</div>
                            )}
                        </div>
                        <div className="header-spacer" />
                        <div className="header-tools">
                            {showSearch && (
                                <button className="command-trigger" type="button" onClick={() => { setCommandQuery(''); setIsCommandOpen(true); }} aria-label="빠른 이동 및 통합 검색">
                                    <Icon name="search" />
                                    <span>빠른 이동 · 통합 검색</span>
                                    <kbd>Ctrl K</kbd>
                                </button>
                            )}
                            {actions}
                        </div>
                    </div>
                </header>

                {showWorkflow && (
                    <nav className="workflow-strip" aria-label="예약 운영 흐름">
                        <div className="workflow-strip-in">
                            <span className="workflow-label">운영 흐름</span>
                            {ADMIN_OPERATION_FLOW.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <Link className={`workflow-step${activePage === item.id ? ' active' : ''}`} to={item.href}>
                                        <span>{item.step}</span>{item.label}
                                    </Link>
                                    {index < ADMIN_OPERATION_FLOW.length - 1 && <Icon name="chevron_right" className="workflow-arrow" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </nav>
                )}

                <div className="content"><div className="content-in">{children}</div></div>
            </div>

            {isCommandOpen && (
                <div className="command-scrim" role="presentation" onMouseDown={() => setIsCommandOpen(false)}>
                    <section className="command-menu" role="dialog" aria-modal="true" aria-label="관리자 빠른 이동" onMouseDown={(event) => event.stopPropagation()}>
                        <form className="command-search" onSubmit={handleCommandSubmit}>
                            <Icon name="search" />
                            <input
                                ref={commandInputRef}
                                value={commandQuery}
                                onChange={(event) => setCommandQuery(event.target.value)}
                                placeholder="메뉴, 고객명, 예약번호를 검색하세요"
                            />
                            <kbd>ESC</kbd>
                        </form>
                        <div className="command-body">
                            <div className="command-caption">{commandQuery.trim() ? '검색 결과' : '자주 찾는 메뉴'}</div>
                            {commandResults.map((item) => (
                                <button type="button" className="command-item" key={item.id} onClick={() => { setIsCommandOpen(false); navigate(item.href); }}>
                                    <span className="command-icon"><Icon name={item.icon} /></span>
                                    <span><b>{item.label}</b><small>{item.description}</small></span>
                                    <Icon name="arrow_forward" className="command-go" />
                                </button>
                            ))}
                            {commandQuery.trim() && (
                                <button type="button" className="command-item command-reservation-search" onClick={() => { setIsCommandOpen(false); navigate(`/admin/reservations?q=${encodeURIComponent(commandQuery.trim())}`); }}>
                                    <span className="command-icon"><Icon name="manage_search" /></span>
                                    <span><b>“{commandQuery.trim()}” 예약 검색</b><small>고객명, 전화번호, 이메일, 예약번호에서 찾습니다.</small></span>
                                    <Icon name="arrow_forward" className="command-go" />
                                </button>
                            )}
                            {commandResults.length === 0 && commandQuery.trim() && (
                                <div className="command-empty">일치하는 메뉴가 없습니다. 아래에서 예약 통합검색을 실행할 수 있습니다.</div>
                            )}
                        </div>
                        <footer className="command-footer">
                            {ADMIN_NAV_GROUPS.map((group) => <span key={group.label}>{group.label}</span>)}
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
};
