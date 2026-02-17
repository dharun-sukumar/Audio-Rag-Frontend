import React, { memo } from 'react';

const ToastContainer = memo(({
    toasts
}) => {
    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-fade-in flex items-center gap-3 min-w-[300px] ${toast.type === 'success'
                        ? 'bg-green-500/90 border-green-600 text-white'
                        : toast.type === 'error'
                            ? 'bg-red-500/90 border-red-600 text-white'
                            : 'bg-blue-500/90 border-blue-600 text-white'
                        }`}
                >
                    {toast.type === 'success' && (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {toast.type === 'error' && (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    {toast.type === 'info' && (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="font-medium text-sm">{toast.message}</span>
                </div>
            ))}
        </div>
    );
});

ToastContainer.displayName = 'ToastContainer';

export default ToastContainer;
