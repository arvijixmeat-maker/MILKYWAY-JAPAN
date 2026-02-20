import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabaseClient';

interface BankAccountSettings {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
}

export const AdminSettings: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [settings, setSettings] = useState<BankAccountSettings>({
        bankName: '신한은행',
        accountNumber: '110-123-456789',
        accountHolder: '(주)몽골리아 은하수'
    });
    const [isSaved, setIsSaved] = useState(false);

    // Load settings from Supabase
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*').eq('key', 'bank_account').single();
            if (data && data.value) {
                setSettings(data.value);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            const { error } = await supabase.from('settings').upsert({
                key: 'bank_account',
                value: settings,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'key'
            });
            if (error) throw error;
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (e) {
            alert('저장에 실패했습니다.');
            console.error('Failed to save bank account settings', e);
        }
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            {/* Sidebar */}
            <AdminSidebar
                activePage="settings"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">서비스 설정</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button className="p-2 text-slate-400 hover:text-teal-500 transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">관리자님, 환영합니다</span>
                            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-6 bg-slate-50 dark:bg-slate-900 flex-1">
                    {/* Success Toast */}
                    {isSaved && (
                        <div className="fixed top-20 right-8 z-50 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span className="font-medium">설정이 저장되었습니다</span>
                        </div>
                    )}

                    {/* Bank Account Settings Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">입금 계좌 정보</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">고객에게 표시될 계좌 정보를 설정하세요</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Bank Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    은행명
                                </label>
                                <input
                                    type="text"
                                    value={settings.bankName}
                                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                                    placeholder="예: 신한은행"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            {/* Account Number */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    계좌번호
                                </label>
                                <input
                                    type="text"
                                    value={settings.accountNumber}
                                    onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                                    placeholder="예: 110-123-456789"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            {/* Account Holder */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    예금주
                                </label>
                                <input
                                    type="text"
                                    value={settings.accountHolder}
                                    onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value })}
                                    placeholder="예: (주)몽골리아 은하수"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                            </div>

                            {/* Preview */}
                            <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">미리보기</p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{settings.bankName || '은행명'}</span>
                                            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{settings.accountNumber || '계좌번호'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">예금주: </span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{settings.accountHolder || '예금주명'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    저장하기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-blue-500 text-xl">info</span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">안내사항</p>
                                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc pl-4">
                                    <li>여기서 설정한 계좌 정보는 고객이 예약 시 결제 페이지에 표시됩니다.</li>
                                    <li>계좌 정보 변경 시 즉시 반영되며, 기존 예약 건에도 적용됩니다.</li>
                                    <li>정확한 정보를 입력해주세요.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
