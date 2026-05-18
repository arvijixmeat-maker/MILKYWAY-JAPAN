import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

/**
 * Editor for the site-wide "tour common FAQ" — the FAQ block displayed at
 * the bottom of every product detail page. Rendered as a tab inside
 * AdminFAQManage so the admin sees one unified "FAQ 관리" menu instead of
 * two confusing entries. No sidebar / header chrome — that's the host
 * page's job.
 */

interface FAQRow {
    id?: string;
    question: string;
    answer: string;
}

const STARTER_ROWS: FAQRow[] = [
    { question: '出発前に何を準備したらいいですか？', answer: '国際線航空券・パスポート (有効期限6ヶ月以上)・モンゴルビザが必要です。ビザ申請は弊社でもサポートいたします。気温差が大きいため、季節を問わず羽織りものは必須です。' },
    { question: 'キャンセル規定を教えてください。', answer: '出発日の31日前まで: 全額返金。30〜15日前: ツアー代金の30%。14〜8日前: 50%。7日前以降: 100%。詳しくは利用規約をご確認ください。' },
    { question: 'ゲル宿泊は寝具がありますか？', answer: '全てのゲルキャンプにベッド・マットレス・毛布・タオルを完備しています。冬季には電気毛布もご用意します。' },
    { question: '1人旅でも参加できますか？', answer: 'もちろん可能です。一人参加追加料金 ¥18,000 を頂戴しております (個室追加料金分)。同行者募集の掲示板もご利用ください。' },
    { question: '食事のアレルギー対応はありますか？', answer: '事前にお知らせいただければ、食物アレルギーや宗教上の食事制限に個別対応いたします。ベジタリアン・ヴィーガン対応も可能です。' },
    { question: '現地での通信手段は？', answer: 'ウランバートル市内は4G完備。ゴビ・テレルジでは電波が弱い場所もあります。ガイドが衛星電話を所持しているため緊急連絡は可能です。' },
];

export const TourFAQEditor: React.FC = () => {
    const [rows, setRows] = useState<FAQRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.tourFaqs.list();
                if (Array.isArray(data) && data.length > 0) {
                    setRows(data.map((d) => ({ id: d.id, question: d.question, answer: d.answer })));
                } else {
                    setRows(STARTER_ROWS);
                }
            } catch (e) {
                console.error('Tour FAQ load failed:', e);
                setRows(STARTER_ROWS);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const update = (idx: number, patch: Partial<FAQRow>) => {
        setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };
    const move = (idx: number, dir: -1 | 1) => {
        setRows((rs) => {
            const next = [...rs];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return rs;
            [next[idx], next[j]] = [next[j], next[idx]];
            return next;
        });
    };
    const removeRow = (idx: number) => {
        if (!confirm('이 질문을 삭제하시겠습니까?')) return;
        setRows((rs) => rs.filter((_, i) => i !== idx));
    };
    const addRow = () => {
        setRows((rs) => [...rs, { question: '', answer: '' }]);
    };

    const handleSave = async () => {
        const clean = rows
            .map((r) => ({ id: r.id, question: r.question.trim(), answer: r.answer.trim() }))
            .filter((r) => r.question || r.answer);
        if (clean.length === 0) {
            if (!confirm('등록된 FAQ가 없습니다. 빈 상태로 저장하시면 상품 상세 페이지에 기본 FAQ가 표시됩니다. 계속하시겠습니까?')) return;
        }
        setSaving(true);
        try {
            await api.tourFaqs.saveBulk(clean);
            setSavedAt(new Date().toLocaleTimeString('ja-JP'));
            const refreshed = await api.tourFaqs.list();
            if (Array.isArray(refreshed)) {
                setRows(refreshed.map((d) => ({ id: d.id, question: d.question, answer: d.answer })));
            }
        } catch (e: any) {
            alert('저장 실패: ' + (e?.message || '알 수 없는 오류'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="py-20 text-center text-slate-500">불러오는 중...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3 items-start text-sm text-blue-800 dark:text-blue-200">
                    <span className="material-symbols-outlined text-base mt-0.5">info</span>
                    <div>
                        <div className="font-semibold mb-1">상품 페이지 하단 FAQ — 한 번 작성하면 모든 상품에 적용</div>
                        <ul className="space-y-1 text-xs leading-relaxed">
                            <li>• 여기에 등록한 FAQ 가 <strong>모든 상품 상세 페이지</strong>의 「ご注意・よくある質問」섹션에 자동으로 표시됩니다.</li>
                            <li>• 특정 상품에만 다른 FAQ 를 보여주려면 해당 상품 편집 페이지에서 별도로 입력 (그 상품에서는 우선 적용).</li>
                            <li>• 「FAQ 목록」/「카테고리 관리」 탭은 <strong>고객센터 페이지(/faq)</strong> 콘텐츠를 다룹니다. 서로 다릅니다.</li>
                        </ul>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {savedAt && (
                        <span className="text-xs text-teal-600 dark:text-teal-400">
                            저장됨 ({savedAt})
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-bold bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        {saving ? '저장 중...' : '전체 저장'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                Q{i + 1}.
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => move(i, -1)}
                                    disabled={i === 0}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                    title="위로"
                                >
                                    <span className="material-symbols-outlined text-base">arrow_upward</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => move(i, 1)}
                                    disabled={i === rows.length - 1}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                    title="아래로"
                                >
                                    <span className="material-symbols-outlined text-base">arrow_downward</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeRow(i)}
                                    className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center"
                                    title="삭제"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        </div>

                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                            질문 (일본어)
                        </label>
                        <input
                            type="text"
                            value={row.question}
                            onChange={(e) => update(i, { question: e.target.value })}
                            placeholder="例) 出発前に何を準備したらいいですか？"
                            className="w-full px-3 py-2 mb-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />

                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                            답변 (일본어)
                        </label>
                        <textarea
                            value={row.answer}
                            onChange={(e) => update(i, { answer: e.target.value })}
                            rows={3}
                            placeholder="例) 国際線航空券・パスポート (有効期限6ヶ月以上)・モンゴルビザが必要です..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-y min-h-[80px]"
                        />
                    </div>
                ))}

                {rows.length === 0 && (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        등록된 FAQ 가 없습니다. 아래 "질문 추가" 버튼으로 시작하세요.
                    </div>
                )}

                <button
                    type="button"
                    onClick={addRow}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">add</span>
                    질문 추가
                </button>
            </div>
        </div>
    );
};

export default TourFAQEditor;
