import React, { memo } from 'react';

const ProfileDialog = memo(({
    showProfileDialog,
    setShowProfileDialog,
    user,
    imageError,
    setImageError,
    getUserInitials,
    handleSignOut
}) => {
    if (!showProfileDialog || !user) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
                onClick={() => setShowProfileDialog(false)}
            />
            <div className="fixed bottom-4 left-4 z-[90] lg:left-20">
                <div
                    className="bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-sm p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Profile</h3>
                        <button
                            onClick={() => setShowProfileDialog(false)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        {user.photoURL && !imageError.has('profile') ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName || user.email}
                                className="w-16 h-16 rounded-full flex-shrink-0 object-cover border-2 border-slate-200 dark:border-white/10"
                                onError={() => setImageError(prev => new Set(prev).add('profile'))}
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-lg text-white font-bold flex-shrink-0 border-2 border-slate-200 dark:border-white/10">
                                {getUserInitials(user)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold dark:text-white truncate">{user.displayName || user.email}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                            <span className="inline-block mt-1 text-xs text-[#10a37f] font-semibold">Pro Plan</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all font-semibold"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
});

ProfileDialog.displayName = 'ProfileDialog';

export default ProfileDialog;
