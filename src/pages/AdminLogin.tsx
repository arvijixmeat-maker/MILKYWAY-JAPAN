import React, { useState } from 'react';
import { api } from '../lib/api';
import { Icon } from '../components/admin/console/Icon';
import '../styles/admin-console.css';

export const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.auth.login(email, password);
            if (response.success) {
                window.location.href = '/admin';
            } else {
                setError(response.error || '로그인에 실패했습니다.');
            }
        } catch (err) {
            setError('로그인 요청을 처리하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrap">
            <div className="login-brand">
                <div className="login-brand-in">
                    <div className="row" style={{ gap: 12 }}>
                        <span className="brand-mark" style={{ width: 46, height: 46 }}><Icon name="flight_takeoff" /></span>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>MILKYWAY</div>
                            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>Admin Console</div>
                        </div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <h1 className="login-h">예약부터 가이드 배정까지,<br />일본 여행 운영을 한 곳에서.</h1>
                    <p className="login-p">사용자 페이지는 일본어로, 관리자 콘솔은 한국어 기준으로 예약·견적·상품·콘텐츠를 관리합니다.</p>
                    <div className="login-stats">
                        <div><b>예약</b><span>견적부터 확정까지</span></div>
                        <div><b>상품</b><span>카탈로그 운영</span></div>
                        <div><b>콘텐츠</b><span>매거진·후기·FAQ</span></div>
                    </div>
                </div>
            </div>

            <div className="login-form-side">
                <form className="login-card" onSubmit={handleLogin}>
                    <div className="eyebrow"><span className="dot" />관리자 로그인</div>
                    <h2 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', margin: '6px 0 6px' }}>운영을 시작합니다</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 26px' }}>관리자 계정으로 로그인해 주세요.</p>

                    {error && (
                        <div style={{
                            marginBottom: 18, padding: '12px 14px', borderRadius: 'var(--r-md)',
                            background: 'var(--mrt-red-soft)', color: 'var(--mrt-red)',
                            fontSize: 13, fontWeight: 600, lineHeight: 1.5,
                        }}>{error}</div>
                    )}

                    <div className="field">
                        <label>이메일</label>
                        <input className="inp" type="text" inputMode="email" value={email}
                            onChange={(e) => setEmail(e.target.value)} placeholder="admin@milkyway.jp"
                            autoComplete="email" required />
                    </div>
                    <div className="field">
                        <label>비밀번호</label>
                        <input className="inp" type="password" value={password}
                            onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력"
                            autoComplete="current-password" required />
                    </div>

                    <button className="btn btn-ink btn-lg" style={{ width: '100%' }} type="submit" disabled={loading}>
                        {loading
                            ? <><Icon name="progress_activity" className="spin" />로그인 중</>
                            : <><Icon name="login" />로그인</>}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: 18 }}>
                        <button type="button" onClick={() => { window.location.href = '/'; }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            사용자 사이트로 돌아가기
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};
