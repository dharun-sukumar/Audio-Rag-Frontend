import React, { memo } from 'react';

const LoginModal = memo(({
    showLoginModal,
    setShowLoginModal,
    setHasDismissedLoginPrompt,
    shouldShakeLogin,
    handleGoogleSignIn
}) => {
    if (!showLoginModal) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
            <div className={`relative bg-white dark:bg-[#1a1a1a] rounded-[38px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-white/10 p-8 flex flex-col items-center overflow-hidden pointer-events-auto hover:-translate-y-1 transition-all duration-500 ease-out group/card ${shouldShakeLogin ? 'animate-shake' : ''}`}>
                <div className="absolute top-0 right-0 p-4">
                    <button
                        onClick={() => {
                            setShowLoginModal(false);
                            setHasDismissedLoginPrompt(true);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="w-20 h-20 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-3xl flex items-center justify-center mb-8 text-white shadow-lg shadow-[#10a37f]/30">
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
                    </svg>
                </div>

                <h2 className="text-3xl font-bold mb-3 tracking-tight dark:text-white text-center">Authentication Required</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-10 text-center max-w-sm">Sign in with Google to continue with this action and save your progress.</p>

                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#171717] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 dark:hover:bg-[#10a37f]/10 transition-all font-semibold shadow-lg active:scale-[0.98]"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Sign in with Google</span>
                </button>
            </div>
        </div>
    );
});

LoginModal.displayName = 'LoginModal';

export default LoginModal;
