import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../lib/api';

/**
 * 답장 도우미 — 채널톡(또는 LINE·메일)에서 온 고객 메시지를 붙여 넣으면
 * 일본어 답장 초안 + 한국어 뜻 + 보내기 전 확인할 점을 만든다. 채널톡 유료 플랜 없이 쓴다.
 * (유료 플랜이면 아래 「자동 연동」으로 채널톡 내부대화에 초안이 자동으로 남는다.)
 */
interface Status { hasKeys: boolean; hasWebhook: boolean; hasAiKey: boolean; webhookUrl: string; connectedAt: string; keyHint: string }
interface Draft { replyJa: string; replyKo: string; checksKo: string[] }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6EFEC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
const area: React.CSSProperties = { padding: '12px 14px', border: '1px solid #DDEBE7', borderRadius: 12, fontSize: 14, lineHeight: 1.7, width: '100%', boxSizing: 'border-box', resize: 'vertical', color: '#123B3A', fontFamily: 'inherit' };
const inp: React.CSSProperties = { height: 42, padding: '0 12px', border: '1px solid #DDEBE7', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' };
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#5F7674' };

export const AdminChannelTalk: React.FC = () => {
    // ── 답장 도우미 ──
    const [conversation, setConversation] = useState('');
    const [koDraft, setKoDraft] = useState('');
    const [draft, setDraft] = useState<Draft | null>(null);
    const [replyJa, setReplyJa] = useState('');
    const [instruction, setInstruction] = useState('');
    const [busy, setBusy] = useState<'' | 'draft' | 'revise'>('');
    const [copied, setCopied] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const run = async (kind: 'draft' | 'revise') => {
        if (busy) return;
        setBusy(kind); setMsg(null); setCopied(false);
        try {
            const d: Draft = await api.channelTalk.draft(kind === 'revise'
                ? { conversation, previousJa: replyJa, instruction }
                : { conversation, koDraft: koDraft.trim() || undefined });
            setDraft(d); setReplyJa(d.replyJa);
            if (kind === 'revise') setInstruction('');
        } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '초안을 만들지 못했습니다.' }); }
        finally { setBusy(''); }
    };
    const copy = async () => {
        try { await navigator.clipboard.writeText(replyJa); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
        catch { setMsg({ ok: false, text: '복사하지 못했습니다. 일본어 칸을 직접 선택해 복사해 주세요.' }); }
    };
    const reset = () => { setConversation(''); setKoDraft(''); setDraft(null); setReplyJa(''); setInstruction(''); setMsg(null); };

    // ── 자동 연동 (채널톡 유료 플랜) ──
    const [st, setSt] = useState<Status | null>(null);
    const [autoOpen, setAutoOpen] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [accessSecret, setAccessSecret] = useState('');
    const [linkBusy, setLinkBusy] = useState(false);
    const load = async () => { try { setSt(await api.channelTalk.status()); } catch { /* 상태를 못 읽어도 도우미는 쓸 수 있다 */ } };
    useEffect(() => { void load(); }, []);
    const connect = async () => {
        setLinkBusy(true); setMsg(null);
        try { await api.channelTalk.connect(accessKey, accessSecret); setAccessKey(''); setAccessSecret(''); setMsg({ ok: true, text: '연결했습니다. 이제 고객 메시지가 오면 채널톡 「내부대화」에 답장 초안이 자동으로 남습니다.' }); await load(); }
        catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '연결하지 못했습니다.' }); }
        finally { setLinkBusy(false); }
    };
    const disconnect = async () => {
        setLinkBusy(true); setMsg(null);
        try { await api.channelTalk.disconnect(); setMsg({ ok: true, text: '연결을 끊었습니다.' }); await load(); }
        catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '끊지 못했습니다.' }); }
        finally { setLinkBusy(false); }
    };
    const on = !!(st?.hasKeys && st?.hasWebhook);
    const canDraft = !!(conversation.trim() || koDraft.trim());

    return (
        <AdminLayout activePage="channel-talk" title="답장 도우미" eyebrow="상담"
            description="고객 메시지를 붙여 넣으면 일본어 답장 초안과 한국어 뜻을 만들어 드립니다. 복사해서 채널톡에 붙여 넣고 보내세요.">
            <div className="route-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
                {msg && <div role="status" style={{ padding: '12px 16px', borderRadius: 12, background: msg.ok ? '#E8FAF5' : '#FFF1F0', color: msg.ok ? '#007F75' : '#B42318', fontSize: 13, fontWeight: 700 }}>{msg.text}</div>}
                {st && !st.hasAiKey && <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FFF4D6', color: '#8A5A00', fontSize: 13, fontWeight: 700 }}>AI 키(ANTHROPIC_API_KEY)가 없어 초안을 만들 수 없습니다.</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,460px),1fr))', gap: 14, alignItems: 'start' }}>
                    {/* 왼쪽 — 넣는 곳 */}
                    <div style={card}>
                        <label style={lbl}>① 고객 메시지 붙여 넣기 <span style={{ fontWeight: 500, color: '#8A9E9B' }}>일본어 원문 그대로 · 앞의 대화도 함께 넣으면 더 정확합니다</span>
                            <textarea rows={9} style={area} value={conversation} onChange={e => setConversation(e.target.value)}
                                placeholder={'예)\nお客様: 4日目の一般的な日程をもう少し教えていただけますか？\n出発時間、バヤンザグとツァガーン・スワルガの観光時間、宿泊施設への到着時間を…'} /></label>
                        <label style={lbl}>② 한국어로 답을 직접 쓰기 <span style={{ fontWeight: 500, color: '#8A9E9B' }}>선택 — 비워 두면 AI가 답 내용을 제안합니다</span>
                            <textarea rows={4} style={area} value={koDraft} onChange={e => setKoDraft(e.target.value)}
                                placeholder="예) 4일차는 아침 8시쯤 출발하고, 바양작은 1시간 정도 봅니다. 숙소에는 저녁 6시쯤 도착합니다." /></label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-ink" disabled={!canDraft || !!busy} onClick={() => void run('draft')}>
                                {busy === 'draft' ? '만드는 중… (10~20초)' : koDraft.trim() ? '일본어 답장으로 바꾸기' : '답장 초안 만들기'}
                            </button>
                            {(conversation || koDraft || draft) && <button type="button" className="btn btn-ghost" onClick={reset} disabled={!!busy}>새로 시작</button>}
                        </div>
                        <span style={{ fontSize: 11.5, color: '#8A9E9B', lineHeight: 1.7 }}>금액·출발 시각·숙소 시설처럼 붙여 넣은 대화와 상품 정보에 없는 내용은 AI가 지어내지 않고 「확인」으로 알려 줍니다. 붙여 넣은 내용은 저장하지 않습니다.</span>
                    </div>

                    {/* 오른쪽 — 결과 */}
                    <div style={card}>
                        {!draft ? (
                            <div style={{ padding: '36px 8px', textAlign: 'center', fontSize: 13.5, color: '#8A9E9B', lineHeight: 1.8 }}>
                                왼쪽에 고객 메시지를 붙여 넣고 「답장 초안 만들기」를 누르면<br />여기에 <b style={{ color: '#5F7674' }}>일본어 답장 · 한국어 뜻 · 보내기 전 확인할 점</b>이 나옵니다.
                            </div>
                        ) : (
                            <>
                                <label style={lbl}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ flex: 1 }}>일본어 답장 <span style={{ fontWeight: 500, color: '#8A9E9B' }}>여기서 바로 고칠 수 있습니다</span></span>
                                        <button type="button" className="btn btn-ink" onClick={() => void copy()} disabled={!replyJa.trim()}>{copied ? '복사됨 ✓' : '복사'}</button>
                                    </span>
                                    <textarea rows={10} style={{ ...area, fontFamily: "'Noto Sans JP',sans-serif" }} value={replyJa} onChange={e => setReplyJa(e.target.value)} />
                                </label>
                                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F7FAF9', fontSize: 13.5, lineHeight: 1.8, color: '#3F5856', whiteSpace: 'pre-wrap' }}>
                                    <b style={{ display: 'block', fontSize: 11.5, color: '#8A9E9B', marginBottom: 4 }}>한국어 뜻{replyJa !== draft.replyJa ? ' (일본어를 직접 고치기 전의 뜻)' : ''}</b>{draft.replyKo}
                                </div>
                                {draft.checksKo.length > 0 && (
                                    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#FFF4D6', fontSize: 13, lineHeight: 1.8, color: '#8A5A00' }}>
                                        <b style={{ display: 'block', marginBottom: 2 }}>보내기 전 확인</b>
                                        {draft.checksKo.map((c, i) => <div key={i}>· {c}</div>)}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                                    <input style={{ ...inp, fontFamily: 'inherit' }} value={instruction} onChange={e => setInstruction(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && instruction.trim()) void run('revise'); }}
                                        placeholder="고칠 점을 한국어로 — 예: 더 짧게 / 출발은 8시라고 넣어 줘 / 더 부드럽게" />
                                    <button type="button" className="btn btn-ghost" style={{ flex: 'none' }} disabled={!instruction.trim() || !!busy} onClick={() => void run('revise')}>{busy === 'revise' ? '고치는 중…' : '다시 쓰기'}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 유료 플랜용 자동 연동 */}
                <div style={{ ...card, gap: autoOpen ? 12 : 0 }}>
                    <button type="button" onClick={() => setAutoOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? '#00A88B' : '#B6C7C3' }} />
                        <b style={{ fontSize: 14, color: '#123B3A' }}>채널톡 자동 연동 {on ? '— 연결됨' : '— 꺼짐'}</b>
                        <span style={{ flex: 1, fontSize: 12, color: '#8A9E9B' }}>채널톡 유료 플랜(스타트업 이상)에서만 됩니다 · 붙여 넣기 없이 내부대화에 초안이 자동으로 남음</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#5F7674' }}>{autoOpen ? '접기' : '펼치기'}</span>
                    </button>
                    {autoOpen && (on ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#3F5856' }}>
                            <span style={{ flex: 1 }}>{st?.connectedAt ? `${new Date(st.connectedAt).toLocaleString('ko-KR')} 연결 · 키 ${st.keyHint}` : '연결됨'}</span>
                            <button type="button" className="btn btn-ghost" onClick={disconnect} disabled={linkBusy}>연결 끊기</button>
                        </div>
                    ) : (
                        <>
                            <span style={{ fontSize: 13, lineHeight: 1.8, color: '#3F5856' }}>
                                채널톡의 API 인증 키는 <b>무료+ 플랜에서는 만들 수 없습니다</b>(스타트업 플랜부터). 유료 플랜으로 바꾸신 뒤에는 채널톡 → 설정 → 보안 및 개발 → API → 「새 인증 키 만들기」로 만든 두 값을 넣으면 됩니다. 웹훅 등록은 자동으로 합니다.
                            </span>
                            <label style={lbl}>Access Key<input style={inp} value={accessKey} onChange={e => setAccessKey(e.target.value)} autoComplete="off" spellCheck={false} /></label>
                            <label style={lbl}>Access Secret<input style={inp} type="password" value={accessSecret} onChange={e => setAccessSecret(e.target.value)} autoComplete="off" spellCheck={false} /></label>
                            <button type="button" className="btn btn-ink" style={{ alignSelf: 'flex-start' }} disabled={linkBusy || !accessKey.trim() || !accessSecret.trim()} onClick={connect}>{linkBusy ? '연결 중…' : '연결'}</button>
                        </>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
};
