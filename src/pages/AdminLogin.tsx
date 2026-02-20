import React from 'react';
import { useTranslation } from 'react-i18next';

export const AdminLogin: React.FC = () => {
    const { t } = useTranslation();

    const handleGoogleLogin = () => {
        // Redirect to API endpoint for Google OAuth
        window.location.href = '/api/auth/login/google';
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 font-display">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">관리자 로그인</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">몽골리아 은하수 관리자 페이지</p>
                </div>

                <div className="space-y-6">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold text-lg transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-6 h-6"
                        />
                        <span>Google 계정으로 로그인</span>
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        관리자 권한이 있는 Google 계정으로만 접근 가능합니다.
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 text-center">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
};
