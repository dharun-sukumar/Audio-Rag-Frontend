import React, { memo } from 'react';

const CenteredLoginModal = memo(({
    showCenteredModal,
    setShowCenteredModal,
    user,
    setLoginPromptCooldownActive,
    setModalDismissTime,
    guestMessageCount,
    handleGoogleSignIn
}) => {
    if (!showCenteredModal || user) return null;

    const handleClose = () => {
        setShowCenteredModal(false);
        setLoginPromptCooldownActive(true);
        setModalDismissTime(Date.now());

        // Set cooldown for 10 minutes
        setTimeout(() => {
            // Check if enough messages have passed (5 more messages)
            if (guestMessageCount >= 9) {
                setLoginPromptCooldownActive(false);
            } else {
                // Still in cooldown, but reset flag so it can be re-evaluated
                setLoginPromptCooldownActive(false);
            }
        }, 10 * 60 * 1000); // 10 minutes
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Blur/dim background */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
                {/* Decorative Elements */}
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#10a37f]/10 blur-[60px] rounded-full" />
                <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full" />

                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-[#10a37f]/20 transform -rotate-3">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="10.5" r="1.5" fill="currentColor" />
                            <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold mb-3 dark:text-white tracking-tight">Enjoying Zentra Journal?</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        Sign in to save your progress, access all your conversations, and unlock personalized insights.
                    </p>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-xl mb-4"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
});

CenteredLoginModal.displayName = 'CenteredLoginModal';

export default CenteredLoginModal;
