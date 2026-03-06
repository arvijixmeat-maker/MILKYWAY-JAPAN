import React from 'react';

export const ConsultationBanner: React.FC = () => {
    return (
        <section className="px-5 py-10">
            <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-6 border border-primary/10">
                <h4 className="text-[17px] font-bold text-slate-900 dark:text-white mb-1">まだ日程が決まっていませんか？</h4>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">旅行専門家がお客様の好みに合わせた1:1オーダーメイド日程を無料で設計いたします。</p>
                <button className="w-full py-3.5 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    無料コンサルティングを始める
                </button>
            </div>
        </section>
    );
};
