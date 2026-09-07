import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
import { api } from '../lib/api';
import type { GuideSettlement, GuideSettlementStatus } from '../types/guideSettlement';
import '../styles/guide-settlement.css';

const STATUS: Record<GuideSettlementStatus, { label: string; tone: string }> = {
    draft: { label: '작성 전', tone: 'gray' },
    in_progress: { label: '가이드 입력 중', tone: 'blue' },
    submitted: { label: '검토 필요', tone: 'orange' },
    changes_requested: { label: '수정 요청', tone: 'red' },
    approved: { label: '승인 완료', tone: 'green' },
    paid: { label: '지급 완료', tone: 'purple' },
};

const money = (value: number, currency = 'MNT') =>
    new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'mn-MN', {
        style: 'currency', currency, maximumFractionDigits: 0,
    }).format(Number(value || 0));

const reservationLabel = (r: any) =>
    `${r.reservationNumber || r.reservation_number || '예약'} · ${r.customerName || r.customer_name || '고객'} · ${r.productName || r.product_name || '투어'}`;

export const AdminGuideSettlementManage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [reports, setReports] = useState<GuideSettlement[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [selected, setSelected] = useState<GuideSettlement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [createForm, setCreateForm] = useState({ reservationId: searchParams.get('reservation') || '', advanceAmount: '0', exchangeRate: '22.4' });
    const [budget, setBudget] = useState({ spentAt: new Date().toISOString().slice(0, 10), category: '식사', description: '', quantity: '1', unitPrice: '', plannedAmount: '' });

    const load = async (preferredId?: string) => {
        setLoading(true);
        try {
            const [settlementRows, reservationRows] = await Promise.all([
                api.guideSettlements.list(), api.reservations.list(),
            ]);
            const nextReports = Array.isArray(settlementRows) ? settlementRows : [];
            setReports(nextReports);
            setReservations(Array.isArray(reservationRows) ? reservationRows : []);
            const targetId = preferredId || selected?.id || nextReports[0]?.id;
            if (targetId) {
                const detail = await api.guideSettlements.getAdmin(targetId);
                setSelected(detail);
            } else setSelected(null);
        } catch (error: any) {
            alert(error.message || '정산 정보를 불러오지 못했습니다.');
        } finally { setLoading(false); }
    };

    useEffect(() => { void load(); }, []);
    useEffect(() => { if (searchParams.get('reservation')) setShowCreate(true); }, [searchParams]);

    const filtered = useMemo(() => {
        const value = query.trim().toLowerCase();
        if (!value) return reports;
        return reports.filter((report) => [report.guideName, report.title, report.reservationNumber].join(' ').toLowerCase().includes(value));
    }, [query, reports]);

    const createReport = async () => {
        if (!createForm.reservationId) return alert('예약을 선택해 주세요.');
        setSaving(true);
        try {
            const result = await api.guideSettlements.create({
                reservationId: createForm.reservationId,
                advanceAmount: Number(createForm.advanceAmount || 0),
                exchangeRate: Number(createForm.exchangeRate || 22.4),
            });
            setLinkValue(`${window.location.origin}/guide/settlements/${result.report.id}?token=${result.accessToken}`);
            setShowCreate(false);
            await load(result.report.id);
        } catch (error: any) { alert(error.message || '정산서를 만들지 못했습니다.'); }
        finally { setSaving(false); }
    };

    const issueLink = async () => {
        if (!selected) return;
        if (!confirm('기존 링크는 즉시 사용할 수 없게 됩니다. 새 링크를 발급할까요?')) return;
        const result = await api.guideSettlements.issueLink(selected.id);
        setLinkValue(`${window.location.origin}/guide/settlements/${selected.id}?token=${result.accessToken}`);
    };

    const copyLink = async () => {
        if (!linkValue) return;
        await navigator.clipboard.writeText(linkValue);
        alert('가이드 링크를 복사했습니다.');
    };

    const addBudget = async () => {
        if (!selected || !budget.description.trim()) return alert('예산 항목명을 입력해 주세요.');
        setSaving(true);
        try {
            await api.guideSettlements.addItem(selected.id, {
                ...budget,
                quantity: Number(budget.quantity || 1),
                unitPrice: Number(budget.unitPrice || 0),
                plannedAmount: Number(budget.plannedAmount || Number(budget.quantity || 1) * Number(budget.unitPrice || 0)),
                actualAmount: 0, currency: 'MNT', exchangeRate: 1,
            });
            setBudget((value) => ({ ...value, description: '', unitPrice: '', plannedAmount: '' }));
            await load(selected.id);
        } catch (error: any) { alert(error.message || '예산을 추가하지 못했습니다.'); }
        finally { setSaving(false); }
    };

    const changeStatus = async (status: GuideSettlementStatus) => {
        if (!selected) return;
        const note = status === 'changes_requested' ? prompt('가이드에게 전달할 수정 내용을 입력해 주세요.') : undefined;
        if (status === 'changes_requested' && !note) return;
        await api.guideSettlements.setStatus(selected.id, status, note || undefined);
        await load(selected.id);
    };

    const pendingReservations = reservations.filter((reservation) => {
        const guide = reservation.assignedGuide || reservation.assigned_guide;
        return guide && !reports.some((report) => report.reservationId === reservation.id && report.status !== 'paid');
    });
    const totals = reports.reduce((acc, report) => ({
        submitted: acc.submitted + (report.status === 'submitted' ? 1 : 0),
        receipts: acc.receipts + report.totals.receiptCount,
        reimbursement: acc.reimbursement + report.totals.reimbursement,
    }), { submitted: 0, receipts: 0, reimbursement: 0 });

    return (
        <AdminLayout activePage="guide-settlements" title="가이드 비용 정산" actions={
            <button className="btn primary" type="button" onClick={() => setShowCreate(true)}><Icon name="add" /> 새 정산 만들기</button>
        }>
            <div className="gs-kpis">
                <div className="gs-kpi"><span>검토 대기</span><strong>{totals.submitted}건</strong><small>가이드가 제출한 정산</small></div>
                <div className="gs-kpi"><span>수집된 증빙</span><strong>{totals.receipts}개</strong><small>사진과 PDF 영수증</small></div>
                <div className="gs-kpi"><span>추가 지급 예정</span><strong>{money(totals.reimbursement)}</strong><small>선지급금을 초과한 실지출</small></div>
            </div>

            {linkValue && <div className="gs-link-banner"><div><strong>가이드 전용 링크가 발급되었습니다</strong><span>이 화면을 닫으면 토큰을 다시 볼 수 없습니다. 지금 복사해 전달하세요.</span></div><input readOnly value={linkValue} /><button className="btn primary" onClick={copyLink}>링크 복사</button></div>}

            <div className="gs-admin-grid">
                <section className="card gs-list-panel">
                    <div className="gs-panel-head"><div><h2>정산 목록</h2><p>{filtered.length}개의 투어</p></div><div className="gs-search"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="가이드·예약번호 검색" /></div></div>
                    {loading ? <div className="gs-empty">불러오는 중...</div> : filtered.length === 0 ? <div className="gs-empty">아직 정산서가 없습니다.<br />예약에 가이드를 배정한 뒤 첫 정산서를 만들어 보세요.</div> : (
                        <div className="gs-report-list">{filtered.map((report) => <button key={report.id} type="button" className={`gs-report-row${selected?.id === report.id ? ' active' : ''}`} onClick={async () => setSelected(await api.guideSettlements.getAdmin(report.id))}>
                            <div className="gs-row-top"><strong>{report.title}</strong><span className={`gs-status ${STATUS[report.status].tone}`}>{STATUS[report.status].label}</span></div>
                            <div className="gs-row-meta"><span>{report.guideName}</span><span>{report.startDate || '날짜 미정'}</span><span>{report.reservationNumber}</span></div>
                            <div className="gs-row-money"><span>실지출 {money(report.totals.actual)}</span><span>증빙 {report.totals.receiptCount}/{report.totals.itemCount}</span></div>
                        </button>)}</div>
                    )}
                </section>

                <section className="card gs-detail-panel">
                    {!selected ? <div className="gs-empty large">왼쪽에서 정산서를 선택해 주세요.</div> : <>
                        <div className="gs-detail-head"><div><span className={`gs-status ${STATUS[selected.status].tone}`}>{STATUS[selected.status].label}</span><h2>{selected.title}</h2><p>{selected.guideName} · {selected.travelers}명 · {selected.startDate || '날짜 미정'}{selected.endDate ? ` ~ ${selected.endDate}` : ''}</p></div><button className="btn" onClick={issueLink}><Icon name="link" /> 링크 재발급</button></div>
                        {selected.adminNote && <div className="gs-note"><Icon name="info" /> 수정 요청: {selected.adminNote}</div>}
                        <div className="gs-money-grid">
                            <div><span>계획 예산</span><strong>{money(selected.totals.planned)}</strong></div>
                            <div><span>실제 지출</span><strong>{money(selected.totals.actual)}</strong></div>
                            <div><span>선지급금</span><strong>{money(selected.advanceAmount)}</strong></div>
                            <div className={selected.totals.reimbursement > 0 ? 'danger' : 'success'}><span>{selected.totals.reimbursement > 0 ? '추가 지급' : '반납 예정'}</span><strong>{money(selected.totals.reimbursement || selected.totals.cashBalance)}</strong></div>
                        </div>

                        <div className="gs-section-title"><div><h3>예산 및 지출 내역</h3><p>예산은 관리자가, 실제 지출과 증빙은 가이드가 기록합니다.</p></div><span>환율 ¥1 = ₮{selected.exchangeRate}</span></div>
                        <div className="gs-table-wrap"><table className="gs-table"><thead><tr><th>일자·분류</th><th>항목</th><th>계획</th><th>실지출</th><th>증빙</th></tr></thead><tbody>
                            {(selected.items || []).map((item) => <tr key={item.id}><td>{item.spentAt}<small>{item.category}</small></td><td><strong>{item.description}</strong><small>{item.merchant || item.note}</small></td><td>{money(item.plannedAmount)}</td><td>{money(item.baseAmount)}{item.currency === 'JPY' && <small>{money(item.actualAmount, 'JPY')}</small>}</td><td>{item.receipts.length ? item.receipts.map((receipt) => <a key={receipt.id} href={receipt.url} target="_blank" rel="noreferrer">{receipt.fileName}</a>) : <span className="gs-missing">미첨부</span>}</td></tr>)}
                            {!selected.items?.length && <tr><td colSpan={5} className="gs-empty">등록된 항목이 없습니다.</td></tr>}
                        </tbody></table></div>

                        {['draft', 'in_progress', 'changes_requested'].includes(selected.status) && <div className="gs-budget-form"><select value={budget.category} onChange={(e) => setBudget({ ...budget, category: e.target.value })}><option>식사</option><option>숙소</option><option>교통</option><option>입장료</option><option>연료</option><option>기타</option></select><input type="date" value={budget.spentAt} onChange={(e) => setBudget({ ...budget, spentAt: e.target.value })} /><input className="wide" value={budget.description} onChange={(e) => setBudget({ ...budget, description: e.target.value })} placeholder="예: 8/14 점심 식사" /><input type="number" value={budget.quantity} onChange={(e) => setBudget({ ...budget, quantity: e.target.value })} placeholder="수량" /><input type="number" value={budget.unitPrice} onChange={(e) => setBudget({ ...budget, unitPrice: e.target.value })} placeholder="단가 ₮" /><input type="number" value={budget.plannedAmount} onChange={(e) => setBudget({ ...budget, plannedAmount: e.target.value })} placeholder="계획금액(자동)" /><button className="btn primary" disabled={saving} onClick={addBudget}><Icon name="add" /> 예산 추가</button></div>}

                        <div className="gs-actions">
                            {selected.status === 'submitted' && <><button className="btn" onClick={() => changeStatus('changes_requested')}>수정 요청</button><button className="btn primary" onClick={() => changeStatus('approved')}><Icon name="check" /> 정산 승인</button></>}
                            {selected.status === 'approved' && <button className="btn primary" onClick={() => changeStatus('paid')}><Icon name="payments" /> 지급 완료 처리</button>}
                            <span>영수증 누락 {selected.totals.missingReceiptCount}건</span>
                        </div>
                    </>}
                </section>
            </div>

            {showCreate && <div className="gs-modal-backdrop" onMouseDown={() => setShowCreate(false)}><div className="gs-modal" onMouseDown={(e) => e.stopPropagation()}><div className="gs-modal-head"><div><span>NEW SETTLEMENT</span><h2>예약에서 정산서 만들기</h2><p>가이드가 배정된 예약만 표시됩니다.</p></div><button className="icon-btn" onClick={() => setShowCreate(false)}><Icon name="close" /></button></div><label>예약 선택<select value={createForm.reservationId} onChange={(e) => setCreateForm({ ...createForm, reservationId: e.target.value })}><option value="">예약을 선택하세요</option>{pendingReservations.map((reservation) => <option key={reservation.id} value={reservation.id}>{reservationLabel(reservation)}</option>)}</select></label><div className="gs-modal-fields"><label>가이드 선지급금 (₮)<input type="number" value={createForm.advanceAmount} onChange={(e) => setCreateForm({ ...createForm, advanceAmount: e.target.value })} /></label><label>기준 환율 (¥1 = ₮)<input type="number" step="0.1" value={createForm.exchangeRate} onChange={(e) => setCreateForm({ ...createForm, exchangeRate: e.target.value })} /></label></div><div className="gs-modal-tip"><Icon name="security" /> 생성된 링크는 해당 예약 정산서만 열 수 있으며, 새 링크를 만들면 기존 링크는 폐기됩니다.</div><div className="gs-modal-actions"><button className="btn" onClick={() => setShowCreate(false)}>취소</button><button className="btn primary" disabled={saving || !createForm.reservationId} onClick={createReport}>{saving ? '생성 중...' : '정산서와 링크 생성'}</button></div></div></div>}
        </AdminLayout>
    );
};

export default AdminGuideSettlementManage;
