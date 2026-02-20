import React from 'react';

export const AdventureSkeleton: React.FC = () => {
    return (
        <section className="py-8 px-5">
            {/* Header Placeholder */}
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>

            {/* Horizontal List Placeholder */}
            <div className="flex gap-3 overflow-x-hidden">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="min-w-[160px] w-[160px] animate-pulse">
                        {/* Image */}
                        <div className="aspect-[4/3] rounded-xl bg-gray-200 dark:bg-gray-800 mb-3" />

                        {/* Content */}
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mt-1" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
