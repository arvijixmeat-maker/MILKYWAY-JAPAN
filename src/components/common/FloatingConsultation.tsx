import React from 'react';

export const FloatingConsultation: React.FC = () => {
    return (
        <div className="fixed bottom-24 right-5 z-[60] flex flex-col gap-3 pointer-events-none">
            {/* LINE FAB */}
            <a 
                href="https://line.me/ti/p/2mQyucsGcT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-[#06C755] rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all group relative"
                aria-label="LINE Inquiry"
            >
                <img src="/assets/icons/line.png" alt="LINE" className="w-8 h-8 object-contain" />
                <span className="absolute right-16 bg-white dark:bg-zinc-800 text-slate-700 dark:text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100 dark:border-zinc-700">
                    LINEで相談する
                </span>
            </a>

            {/* Real-time Consultation FAB (Channel Talk) */}
            <a 
                href="https://jzz1k.channel.io/home" 
                target="_blank" 
                rel="noopener noreferrer"
                className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all group relative border border-slate-100 dark:border-zinc-700"
                aria-label="Real-time Inquiry"
            >
                <span className="material-symbols-outlined text-3xl text-primary font-light">chat_bubble</span>
                <span className="absolute right-16 bg-white dark:bg-zinc-800 text-slate-700 dark:text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100 dark:border-zinc-700">
                    リアルタイム相談
                </span>
            </a>
        </div>
    );
};
