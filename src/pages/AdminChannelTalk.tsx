import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../lib/api';

/**
 * 채널톡 연동 — 고객 메시지가 오면 일본어 답장 초안(+ 한국어 뜻)을 그 채팅의 「내부대화」에 자동으로 남긴다.
 * 키 두 개만 넣으면 웹훅 등록까지 서버가 알아서 한다. 보내는 것은 항상 담당자.
 */
interface Status { hasKeys: boolean; hasWebhook: boolean; hasAiKey: boolean; webhookUrl: string; connectedAt: string; keyHint: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6EFEC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
const inp: React.CSSProperties = { height: 42, padding: '0 12px', border: '1px solid #DDEBE7', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' };

export const AdminChannelTalk: React.FC = () => {
    const [st, setSt] = useState<Status | null>(null);
    const [accessKey, setAccessKey] = useState('');
    const [accessSecret, setAccessSecret] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = async () => { try { setSt(await api.channelTalk.status()); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '상태를 불러오지 못했습니다.' }); } };
    useEffect(() => { void load(); }, []);

    const connect = async () => {
        setBusy(true); setMsg(null);
        try {
            await api.channelTalk.connect(accessKey, accessSecret);
            setAccessKey(''); setAccessSecret('');
            setMsg({ ok: true, text: '연결했습니다. 이제 고객 메시지가 오면 그 채팅의 「내부대화」에 답장 초안이 자동으로 남습니다.' });
            await load();
        } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '연결하지 못했습니다.' }); }
        finally { setBusy(false); }
    };
    const disconnect = async () => {
        setBusy(true); setMsg(null);
        try { await api.channelTalk.disconnect(); setMsg({ ok: true, text: '연결을 끊었습니다. 저장한 키와 웹훅을 지웠습니다.' }); await load(); }
        catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '끊지 못했습니다.' }); }
        finally { setBusy(false); }
    };

    const on = !!(st?.hasKeys && st?.hasWebhook);
    return (
        <AdminLayout activePage="channel-talk" title="채널톡 답장 도우미" eyebrow="상담"
            description="고객 메시지가 오면 일본어 답장 초안과 한국어 뜻을 채널톡 「내부대화」에 자동으로 남깁니다. 보내는 것은 항상 담당자가 합니다.">
            <div className="route-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
                {msg && <div role="status" style={{ padding: '12px 16px', borderRadius: 12, background: msg.ok ? '#E8FAF5' : '#FFF1F0', color: msg.ok ? '#007F75' : '#B42318', fontSize: 13, fontWeight: 700 }}>{msg.text}</div>}

                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? '#00A88B' : '#B6C7C3' }} />
                        <b style={{ fontSize: 15 }}>{st ? (on ? '연결됨' : '연결 안 됨') : '확인 중…'}</b>
                        {on && st?.connectedAt && <span style={{ fontSize: 12, color: '#8A9E9B' }}>{new Date(st.connectedAt).toLocaleString('ko-KR')} · 키 {st.keyHint}</span>}
                        <span style={{ flex: 1 }} />
                        {on && <button type="button" className="btn btn-ghost" onClick={disconnect} disabled={busy}>연결 끊기</button>}
                    </div>
                    {st && !st.hasAiKey && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8A5A00' }}>AI 키(ANTHROPIC_API_KEY)가 없어 초안을 만들 수 없습니다.</span>}
                </div>

                {!on && (
                    <div style={card}>
                        <b style={{ fontSize: 15 }}>연결하기</b>
                        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: '#3F5856' }}>
                            <li>채널톡 → 설정 → <b>보안 및 개발 → API</b> → <b>「새 인증 키 만들기」</b></li>
                            <li>만들어진 <b>Access Key</b>와 <b>Access Secret</b>을 아래에 붙여 넣고 「연결」</li>
                        </ol>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: '#5F7674' }}>Access Key
                            <input style={inp} value={accessKey} onChange={e => setAccessKey(e.target.value)} autoComplete="off" spellCheck={false} /></label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: '#5F7674' }}>Access Secret
                            <input style={inp} type="password" value={accessSecret} onChange={e => setAccessSecret(e.target.value)} autoComplete="off" spellCheck={false} /></label>
                        <button type="button" className="btn btn-ink" style={{ alignSelf: 'flex-start' }} disabled={busy || !accessKey.trim() || !accessSecret.trim()} onClick={connect}>{busy ? '연결 중…' : '연결'}</button>
                        <span style={{ fontSize: 11.5, color: '#8A9E9B', lineHeight: 1.7 }}>웹훅 등록은 자동으로 합니다. 키는 서버에만 저장되고 이 화면을 포함해 어디에도 다시 표시되지 않습니다.</span>
                    </div>
                )}

                <div style={card}>
                    <b style={{ fontSize: 15 }}>이렇게 동작합니다</b>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: '#3F5856' }}>
                        <li>고객이 메시지를 보내면 몇 초 뒤 그 채팅의 <b>「내부대화」</b> 탭에 <b>일본어 답장 초안 + 한국어 뜻 + 보내기 전 확인할 점</b>이 남습니다. 고객에게는 보이지 않습니다.</li>
                        <li>초안을 복사해 고친 뒤 <b>「고객응대」</b> 탭에서 직접 보내세요. AI가 고객에게 스스로 보내지 않습니다.</li>
                        <li>직접 쓰고 싶으면 내부대화에 <b>「번역: 한국어 내용」</b>이라고 쓰세요. 그 내용을 정중한 일본어로 다듬어 줍니다.</li>
                        <li>금액·출발 시각·숙소 시설처럼 대화와 상품 정보에 없는 내용은 AI가 지어내지 않고 「확인」으로 표시합니다.</li>
                        <li>고객이 여러 줄을 연달아 보내면 마지막 메시지에 대해서만 초안을 만듭니다.</li>
                    </ul>
                </div>
            </div>
        </AdminLayout>
    );
};
