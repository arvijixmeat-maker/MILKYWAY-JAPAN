import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import type { GuideSettlement as Settlement } from '../types/guideSettlement';
import '../styles/guide-settlement.css';

const money = (value: number, currency = 'MNT') =>
    new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'mn-MN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));

const STATUS_MN: Record<string, string> = {
    draft: 'Бүртгэл эхлээгүй', in_progress: 'Бүртгэж байна', submitted: 'Шалгуулж байна',
    changes_requested: 'Засвар шаардлагатай', approved: 'Баталгаажсан', paid: 'Төлбөр дууссан',
};

export const GuideSettlement: React.FC = () => {
    const { id: routeId = '' } = useParams();
    const id = routeId || localStorage.getItem('mw-guide-last-report') || '';
    const queryToken = new URLSearchParams(window.location.search).get('token') || '';
    const storageKey = `mw-guide-token:${id}`;
    const [token] = useState(() => queryToken || localStorage.getItem(storageKey) || '');
    const [report, setReport] = useState<Settlement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItemId, setEditingItemId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        spentAt: new Date().toISOString().slice(0, 10), category: 'Хоол', description: '',
        quantity: '1', actualAmount: '', currency: 'MNT', merchant: '', note: '',
    });

    const load = async () => {
        if (!id || !token) { setError('Линк буруу эсвэл хугацаа нь дууссан байна. Менежертэй холбогдоно уу.'); setLoading(false); return; }
        try { setReport(await api.guideSettlements.getGuide(id, token)); setError(''); }
        catch { setError('Энэ линкийг нээх боломжгүй байна. Шинэ линк авахын тулд менежертэй холбогдоно уу.'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (queryToken) {
            localStorage.setItem(storageKey, queryToken);
            localStorage.setItem('mw-guide-last-report', id);
            window.history.replaceState({}, '', window.location.pathname);
        }
        void load();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/guide-sw.js', { scope: '/guide/' }).catch(() => undefined);
    }, [id, token]);

    const editable = !!report && ['draft', 'in_progress', 'changes_requested'].includes(report.status);
    const grouped = useMemo(() => {
        const map = new Map<string, NonNullable<Settlement['items']>>();
        (report?.items || []).forEach((item) => map.set(item.spentAt, [...(map.get(item.spentAt) || []), item]));
        return [...map.entries()];
    }, [report]);

    const saveExpense = async () => {
        if (!report || !form.description.trim() || Number(form.actualAmount) <= 0) return alert('Зардлын утга болон дүнг оруулна уу.');
        setSaving(true);
        try {
            const payload = {
                ...form,
                quantity: Number(form.quantity || 1), unitPrice: Number(form.actualAmount || 0),
                actualAmount: Number(form.actualAmount || 0), currency: form.currency,
                exchangeRate: form.currency === 'JPY' ? report.exchangeRate : 1,
            };
            const result = editingItemId
                ? await api.guideSettlements.updateItem(report.id, editingItemId, payload, token)
                : await api.guideSettlements.addItem(report.id, payload, token);
            const itemId = editingItemId || result.item?.id;
            if (file && itemId) await api.guideSettlements.uploadReceipt(report.id, itemId, file, token);
            setForm((value) => ({ ...value, description: '', actualAmount: '', merchant: '', note: '' }));
            setFile(null); setEditingItemId(''); setShowForm(false); await load();
        } catch (e: any) { alert(e.message || 'Хадгалж чадсангүй.'); }
        finally { setSaving(false); }
    };

    const removeItem = async (itemId: string) => {
        if (!report || !confirm('Энэ зардлыг устгах уу?')) return;
        await api.guideSettlements.deleteItem(report.id, itemId, token); await load();
    };

    const editItem = (item: NonNullable<Settlement['items']>[number]) => {
        setEditingItemId(item.id);
        setForm({
            spentAt: item.spentAt, category: item.category, description: item.description,
            quantity: String(item.quantity || 1), actualAmount: String(item.actualAmount || ''),
            currency: item.currency || 'MNT', merchant: item.merchant || '', note: item.note || '',
        });
        setFile(null);
        setShowForm(true);
    };

    const submit = async () => {
        if (!report) return;
        if (!report.items?.length) return alert('Эхлээд зардлаа бүртгэнэ үү.');
        if (report.totals.missingReceiptCount > 0 && !confirm(`${report.totals.missingReceiptCount} баримт хавсаргаагүй байна. Үргэлжлүүлэх үү?`)) return;
        if (!confirm('Тайланг шалгуулахаар илгээх үү? Илгээсний дараа шууд засах боломжгүй.')) return;
        setSaving(true);
        try { await api.guideSettlements.submit(report.id, token); await load(); }
        catch (e: any) { alert(e.message || 'Илгээж чадсангүй.'); }
        finally { setSaving(false); }
    };

    if (loading) return <main className="guide-app"><div className="guide-loading"><div className="guide-spinner" />Уншиж байна...</div></main>;
    if (error || !report) return <main className="guide-app"><Helmet><meta name="robots" content="noindex,nofollow,noarchive" /></Helmet><div className="guide-error"><span className="material-symbols-outlined">link_off</span><h1>Линк нээгдсэнгүй</h1><p>{error}</p></div></main>;

    return <main className="guide-app">
        <Helmet><title>Зардлын тайлан | MILKYWAY</title><meta name="robots" content="noindex,nofollow,noarchive" /><meta name="theme-color" content="#0f766e" /><link rel="manifest" href="/guide-manifest.webmanifest" /></Helmet>
        <header className="guide-topbar"><div className="guide-brand"><span>MW</span><div><strong>MILKYWAY</strong><small>GUIDE EXPENSE</small></div></div><span className={`guide-state ${report.status}`}>{STATUS_MN[report.status]}</span></header>
        <section className="guide-hero"><span>{report.reservationNumber || 'TOUR REPORT'}</span><h1>{report.title}</h1><p>{report.startDate || 'Огноо тодорхойгүй'}{report.endDate ? ` — ${report.endDate}` : ''} · {report.travelers} аялагч</p><div className="guide-person"><span className="material-symbols-outlined">badge</span><div><small>Хөтөч</small><strong>{report.guideName}</strong></div></div></section>

        {report.adminNote && <div className="guide-alert"><span className="material-symbols-outlined">rate_review</span><div><strong>Засварын хүсэлт</strong><p>{report.adminNote}</p></div></div>}

        <section className="guide-summary">
            <div><span>Урьдчилгаа</span><strong>{money(report.advanceAmount)}</strong></div>
            <div><span>Нийт зардал</span><strong>{money(report.totals.actual)}</strong></div>
            <div className={report.totals.reimbursement > 0 ? 'warn' : 'ok'}><span>{report.totals.reimbursement > 0 ? 'Нэмж авах' : 'Буцаах үлдэгдэл'}</span><strong>{money(report.totals.reimbursement || report.totals.cashBalance)}</strong></div>
        </section>

        <section className="guide-progress"><div><span>Баримтын бүрдэл</span><strong>{report.totals.receiptCount}/{report.totals.itemCount}</strong></div><div className="guide-progress-bar"><i style={{ width: `${report.totals.itemCount ? Math.min(100, report.totals.receiptCount / report.totals.itemCount * 100) : 0}%` }} /></div>{report.totals.missingReceiptCount > 0 && <small>{report.totals.missingReceiptCount} зардлын баримт дутуу байна</small>}</section>

        <section className="guide-content"><div className="guide-section-head"><div><span>EXPENSE LIST</span><h2>Зардлын бүртгэл</h2></div>{editable && <button onClick={() => { setEditingItemId(''); setForm({ spentAt: new Date().toISOString().slice(0, 10), category: 'Хоол', description: '', quantity: '1', actualAmount: '', currency: 'MNT', merchant: '', note: '' }); setFile(null); setShowForm(true); }}><span className="material-symbols-outlined">add</span>Зардал нэмэх</button>}</div>
            {!grouped.length ? <div className="guide-empty"><span className="material-symbols-outlined">receipt_long</span><strong>Зардал бүртгэгдээгүй</strong><p>Доорх товчоор зардал, баримтаа оруулна уу.</p></div> : grouped.map(([date, items]) => <div className="guide-day" key={date}><div className="guide-day-label">{date}<span>{money(items.reduce((sum, item) => sum + item.baseAmount, 0))}</span></div>{items.map((item) => <article className={`guide-expense${editable ? ' editable' : ''}`} key={item.id} onClick={() => editable && editItem(item)}><div className="guide-expense-icon"><span className="material-symbols-outlined">{item.category.includes('Хоол') || item.category.includes('식사') ? 'restaurant' : item.category.includes('Шатах') || item.category.includes('연료') ? 'local_gas_station' : 'payments'}</span></div><div className="guide-expense-main"><small>{item.category}{item.merchant ? ` · ${item.merchant}` : ''}</small><strong>{item.description}</strong><div>{item.plannedAmount > 0 && <span className="planned-chip">Төсөв {money(item.plannedAmount)}</span>}{item.receipts.length ? <span className="receipt-ok"><span className="material-symbols-outlined">photo_camera</span>{item.receipts.length} баримт</span> : <span className="receipt-missing">Баримтгүй</span>}</div></div><div className="guide-expense-price"><strong>{item.actualAmount > 0 ? money(item.baseAmount) : 'Дүн оруулах'}</strong>{item.currency === 'JPY' && item.actualAmount > 0 && <small>{money(item.actualAmount, 'JPY')}</small>}{editable && <button onClick={(event) => { event.stopPropagation(); void removeItem(item.id); }} aria-label="Устгах"><span className="material-symbols-outlined">delete</span></button>}</div></article>)}</div>)}
        </section>

        <footer className="guide-footer"><div><span>Нийт бодит зардал</span><strong>{money(report.totals.actual)}</strong></div>{editable ? <button disabled={saving || !report.items?.length} onClick={submit}>Тайлан илгээх <span className="material-symbols-outlined">arrow_forward</span></button> : <p>{report.status === 'submitted' ? 'Менежер тайланг шалгаж байна.' : report.status === 'approved' ? 'Тайлан баталгаажсан.' : report.status === 'paid' ? 'Тооцоо дууссан.' : 'Засварын мэдээллийг шалгана уу.'}</p>}</footer>

        {showForm && <div className="guide-sheet-backdrop" onMouseDown={() => setShowForm(false)}><form className="guide-sheet" onSubmit={(e) => { e.preventDefault(); void saveExpense(); }} onMouseDown={(e) => e.stopPropagation()}><div className="guide-sheet-handle" /><div className="guide-sheet-head"><div><span>NEW EXPENSE</span><h2>Зардал нэмэх</h2></div><button type="button" onClick={() => setShowForm(false)}><span className="material-symbols-outlined">close</span></button></div><div className="guide-form-row"><label>Огноо<input required type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} /></label><label>Ангилал<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Хоол</option><option>Байр</option><option>Тээвэр</option><option>Тасалбар</option><option>Шатахуун</option><option>Бусад</option></select></label></div><label>Зардлын утга<input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ж: 8/14 өдрийн хоол" /></label><div className="guide-form-row"><label>Мөнгөн тэмдэгт<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="MNT">₮ MNT</option><option value="JPY">¥ JPY</option></select></label><label>Бодит дүн<input required inputMode="numeric" type="number" min="0" value={form.actualAmount} onChange={(e) => setForm({ ...form, actualAmount: e.target.value })} placeholder="0" /></label></div>{form.currency === 'JPY' && <p className="guide-rate">¥1 = ₮{report.exchangeRate} ханшаар {money(Number(form.actualAmount || 0) * report.exchangeRate)}</p>}<label>Дэлгүүр / Байгууллага<input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="Сонголттой" /></label><label className="guide-upload"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="material-symbols-outlined">add_a_photo</span><strong>{file ? file.name : 'Баримтын зураг хавсаргах'}</strong><small>JPG, PNG, WEBP, PDF · 10MB хүртэл</small></label><label>Тайлбар<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Нэмэлт тайлбар (сонголттой)" /></label><button className="guide-save" disabled={saving} type="submit">{saving ? 'Хадгалж байна...' : 'Зардал хадгалах'}</button></form></div>}
    </main>;
};

export default GuideSettlement;
