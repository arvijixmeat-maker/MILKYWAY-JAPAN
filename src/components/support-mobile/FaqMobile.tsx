import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { MobileShell } from '../mobile/MobileShell';
import { M_HAIR, M_PAPER } from '../mobile/mobileTheme';
import { Ico, MEmpty, MLoading, MPills, SubPageBar } from '../mobile/mobileUi';
import { ScreenBody } from '../mylists-mobile/myListsUi';

export interface FaqCategory {
    id: string;
    name: string;
}

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    viewCount: number;
}

const ALL = '';

interface FaqProps {
    faqs: FaqItem[];
    categories: FaqCategory[];
    loading: boolean;
}

/** Mobile FAQ (Claude Design: "M FAQ"). Category chips and questions come from the FAQ admin data. */
export function FaqMobile(props: FaqProps) {
    const navigate = useNavigate();
    const back = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
    };
    return (
        <MobileShell>
            <SubPageBar title="よくある質問" onBack={back} />
            <FaqPanel {...props} />
        </MobileShell>
    );
}

/** The FAQ body without a shell; the PC page shows the same panel in a centred column. */
export function FaqPanel({ faqs, categories, loading }: FaqProps) {
    const navigate = useNavigate();
    const [cat, setCat] = useState(ALL);
    const [openId, setOpenId] = useState<string | null>(null);

    const items = faqs.filter((f) => cat === ALL || f.category === cat);
    const chips: Array<[string, string]> = [[ALL, 'すべて'], ...categories.map((c): [string, string] => [c.name, c.name])];

    const pick = (k: string) => {
        setCat(k);
        setOpenId(null);
    };

    return (
            <ScreenBody eyebrow="FAQ" lead="モンゴル旅行・ツアーのよくあるご質問をまとめました。解決しない場合はお問い合わせください。" label="よくある質問">
                {categories.length > 0 && <MPills items={chips} value={cat} onChange={pick} style={{ margin: '0 -16px', padding: '0 16px' }} />}
                {loading ? <MLoading /> : items.length > 0 ? (
                    <div style={{ border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {items.map((f, i) => {
                            const open = openId === f.id;
                            return (
                                <div key={f.id} style={{ borderTop: `1px solid ${i ? M_HAIR : 'transparent'}` }}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(open ? null : f.id)}
                                        aria-expanded={open}
                                        aria-controls={`faq-a-${f.id}`}
                                        style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: 16, border: 0, background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', color: MW.navy }}
                                    >
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: MW.mintDeep, lineHeight: 1.5 }}>Q</span>
                                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.55 }}>{f.question}</span>
                                        <Ico d="M6 9l6 6 6-6" size={16} color={MW.mute2} width={2} style={{ flexShrink: 0, marginTop: 3, transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s' }} />
                                    </button>
                                    {/* Kept in the DOM while closed so the answers stay readable to crawlers. */}
                                    <div id={`faq-a-${f.id}`} style={{ display: open ? 'flex' : 'none', gap: 10, margin: '0 16px 16px', padding: 14, borderRadius: 14, background: M_PAPER }}>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: MW.mute, lineHeight: 1.6 }}>A</span>
                                        <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13, lineHeight: 1.8, color: MW.ink3, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.answer}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <MEmpty
                        text={cat === ALL ? '登録されたFAQはありません。' : '該当するFAQはありません。'}
                        action={cat === ALL ? undefined : { label: 'すべて表示', onClick: () => pick(ALL) }}
                    />
                )}
                <a
                    href="/contact"
                    onClick={(e) => { e.preventDefault(); navigate('/contact'); window.scrollTo(0, 0); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, border: `1.5px solid ${MW.navy}`, borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 700, color: MW.navy, textDecoration: 'none', boxSizing: 'border-box' }}
                >
                    お問い合わせはこちら →
                </a>
            </ScreenBody>
    );
}
