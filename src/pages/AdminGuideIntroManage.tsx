import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { DEFAULT_GUIDE_INTRO } from '../hooks/useGuideIntro';

/**
 * Admin page to edit the site-wide "Your Guide" intro card (settings key:
 * `guide_intro`). One JSON record: { title, body, chips: string[] }.
 *
 * Shown on every product detail page (mobile + PC). Admin can update the
 * copy without touching code or each product individually.
 */
export const AdminGuideIntroManage: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState(DEFAULT_GUIDE_INTRO.title);
    const [body, setBody] = useState(DEFAULT_GUIDE_INTRO.body);
    const [chipsRaw, setChipsRaw] = useState(DEFAULT_GUIDE_INTRO.chips.join('\n'));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.settings.get('guide_intro');
                if (cancelled) return;
                const raw = res?.value ?? res;
                let parsed: { title?: string; body?: string; chips?: string[] } = {};
                if (typeof raw === 'string') {
                    try { parsed = JSON.parse(raw); } catch { /* ignore */ }
                } else if (raw && typeof raw === 'object') {
                    parsed = raw;
                }
                if (parsed.title) setTitle(parsed.title);
                if (parsed.body) setBody(parsed.body);
                if (Array.isArray(parsed.chips) && parsed.chips.length > 0) setChipsRaw(parsed.chips.join('\n'));
            } catch {
                // keep defaults
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const chips = chipsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
            await api.settings.save('guide_intro', JSON.stringify({ title, body, chips }));
            setSavedAt(new Date().toLocaleTimeString('ja-JP'));
        } catch (e) {
            console.error('Failed to save guide intro:', e);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-app-wrapper flex">
                <AdminSidebar />
                <div className="flex-1 p-8 text-slate-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="admin-app-wrapper flex">
            <AdminSidebar />
            <div className="flex-1 p-8 max-w-3xl">
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-3 inline-flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        대시보드로 돌아가기
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">가이드 소개 관리</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        모든 투어 상품의 상세 페이지(모바일/PC)에 공통으로 표시되는 "가이드 소개" 카드 내용을 한 번에 관리합니다.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            제목 <span className="text-xs text-slate-400">(예: 日本語ガイド同行)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            본문 <span className="text-xs text-slate-400">(2~3 문장 권장)</span>
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            칩(태그) <span className="text-xs text-slate-400">(한 줄에 하나씩, 예: N1 取得済み)</span>
                        </label>
                        <textarea
                            value={chipsRaw}
                            onChange={(e) => setChipsRaw(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                        />
                    </div>

                    {/* Live preview */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 tracking-widest uppercase">
                            미리보기
                        </div>
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-transparent border border-teal-100 dark:border-teal-900/30 dark:from-teal-900/10">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <span className="material-symbols-outlined text-2xl">translate</span>
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-teal-600 tracking-widest uppercase mb-1">Your Guide</div>
                                    <div className="text-[15px] font-bold text-slate-900 dark:text-white">{title || '(제목 없음)'}</div>
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3 whitespace-pre-wrap">
                                {body || '(본문 없음)'}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {chipsRaw
                                    .split('\n')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .map((chip) => (
                                        <span
                                            key={chip}
                                            className="text-[10px] font-semibold px-2 py-1 bg-white dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                                        >
                                            {chip}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-2">
                        {savedAt && (
                            <span className="text-xs text-teal-600 dark:text-teal-400">
                                {savedAt} 에 저장됨
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || !body.trim()}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                                saving || !title.trim() || !body.trim()
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                        >
                            {saving ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
