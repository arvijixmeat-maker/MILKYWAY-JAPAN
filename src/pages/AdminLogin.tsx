import React, { useState } from 'react';
import { api } from '../lib/api';

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
        <div className="min-h-screen bg-slate-950 text-slate-900 font-sans">
            <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
                <section className="relative hidden overflow-hidden bg-slate-950 lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.24),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
                    <div className="relative flex h-full flex-col justify-between p-12 text-white">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 shadow-lg shadow-teal-950/40">
                                <span className="material-symbols-outlined">flight_takeoff</span>
                            </span>
                            <div>
                                <div className="text-xl font-black tracking-tight">MILKYWAY</div>
                                <div className="text-xs font-medium text-teal-100/70">Admin Console</div>
                            </div>
                        </div>

                        <div className="max-w-xl">
                            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-teal-200">운영자 전용</p>
                            <h1 className="text-5xl font-black leading-tight tracking-tight">
                                예약과 견적을 한 곳에서 관리하세요.
                            </h1>
                            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                                사용자 페이지는 일본어로 운영하고, 관리자 페이지는 한국어 기준으로 예약, 견적, 상품, 콘텐츠를 관리합니다.
                            </p>
                        </div>

                        <div className="grid max-w-xl grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <div className="text-2xl font-black">01</div>
                                <div className="mt-1 text-slate-300">견적 확인</div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <div className="text-2xl font-black">02</div>
                                <div className="mt-1 text-slate-300">예약 관리</div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <div className="text-2xl font-black">03</div>
                                <div className="mt-1 text-slate-300">콘텐츠 운영</div>
                            </div>
                        </div>
                    </div>
                </section>

                <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950">
                    <div className="w-full max-w-md">
                        <div className="mb-8 lg:hidden">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                                    <span className="material-symbols-outlined">flight_takeoff</span>
                                </span>
                                <div>
                                    <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MILKYWAY</div>
                                    <div className="text-xs font-medium text-slate-500">Admin Console</div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-8">
                                <p className="mb-2 text-sm font-bold text-teal-600 dark:text-teal-300">관리자 로그인</p>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">운영을 시작합니다</h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    관리자 계정으로 로그인해 주세요.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-5">
                                {error && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                        이메일
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        placeholder="admin@example.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                        비밀번호
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        placeholder="비밀번호 입력"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3.5 text-base font-black text-white shadow-sm transition-all hover:bg-teal-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-teal-300"
                                >
                                    {loading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                            로그인 중
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">login</span>
                                            로그인
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/'}
                                    className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                    사용자 사이트로 돌아가기
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
