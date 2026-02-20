import React from 'react';

export const TravelThemeSkeleton: React.FC = () => {
    return (
        <section className="pt-2 pb-8 bg-white dark:bg-slate-900">
            {/* Tabs Placeholder */}
            <div className="flex overflow-x-auto px-5 mb-6 no-scrollbar gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse flex-shrink-0" />
                ))}
            </div>

            <div className="px-5">
                {/* Banner Placeholder */}
                <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6 bg-gray-200 dark:bg-gray-800 animate-pulse" />

                {/* Product List Placeholder */}
                <div className="space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            {/* Image */}
                            <div className="w-[84px] h-[84px] rounded-xl bg-gray-200 dark:bg-gray-800 flex-shrink-0" />

                            {/* Content */}
                            <div className="flex flex-col justify-center flex-1 gap-2">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                                <div className="flex gap-2">
                                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                                    <div className="h-3 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
                                </div>
                                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded mt-1" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Button Placeholder */}
                <div className="mt-8">
                    <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                </div>
            </div>
        </section>
    );
};
