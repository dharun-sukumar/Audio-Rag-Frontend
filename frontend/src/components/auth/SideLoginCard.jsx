import React, { memo } from 'react';

const SideLoginCard = memo(({
    user,
    authLoading,
    hasDismissedSideCard,
    setHasDismissedSideCard,
    guestMessageCount,
    handleGoogleSignIn
}) => {
    if (user || authLoading || hasDismissedSideCard || guestMessageCount > 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[90] w-[calc(100%-3rem)] sm:w-[320px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-lg border border-slate-200 dark:border-white/10 p-6 overflow-hidden">
                {/* Subtle gradient */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#10a37f]/5 blur-3xl rounded-full" />

                <button
                    onClick={() => {
                        setHasDismissedSideCard(true);
                        if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem('hasDismissedSideCard', 'true');
                        }
                    }}
                    className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white z-10"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="w-12 h-12 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center mb-4 text-white">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
                    </svg>
                </div>

                <h3 className="text-base font-bold mb-1.5 dark:text-white">Welcome to Zentra</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Sign in to save your conversations and unlock all features.
                </p>

                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-sm shadow-md"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Sign in</span>
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 opacity-60">
                    <div className="w-1 h-1 rounded-full bg-[#10a37f]" />
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Guest Mode</span>
                </div>
            </div>
        </div>
    );
});

SideLoginCard.displayName = 'SideLoginCard';

export default SideLoginCard;
