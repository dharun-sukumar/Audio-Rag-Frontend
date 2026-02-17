import React, { memo } from 'react';

const ConfirmationModal = memo(({
    confirmationModal
}) => {
    if (!confirmationModal || !confirmationModal.show) return null;

    const typeStyles = {
        warning: {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
            buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
            border: 'border-yellow-200 dark:border-yellow-800'
        },
        danger: {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconColor: 'text-red-600 dark:text-red-400',
            buttonBg: 'bg-red-500 hover:bg-red-600',
            border: 'border-red-200 dark:border-red-800'
        },
        info: {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            buttonBg: 'bg-blue-500 hover:bg-blue-600',
            border: 'border-blue-200 dark:border-blue-800'
        }
    };

    const styles = typeStyles[confirmationModal.type] || typeStyles.warning;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={confirmationModal.onCancel} />
            <div className="relative w-full max-w-md bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 animate-fade-in">
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 ${styles.iconBg} ${styles.iconColor} rounded-xl flex items-center justify-center`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            {confirmationModal.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {confirmationModal.message}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={confirmationModal.onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                        {confirmationModal.cancelText}
                    </button>
                    <button
                        onClick={confirmationModal.onConfirm}
                        className={`flex-1 px-4 py-2.5 ${styles.buttonBg} text-white font-semibold rounded-xl transition-colors`}
                    >
                        {confirmationModal.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
});

ConfirmationModal.displayName = 'ConfirmationModal';

export default ConfirmationModal;
