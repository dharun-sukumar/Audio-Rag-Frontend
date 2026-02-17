import React from 'react';
import ConversationList from './ConversationList';

const Sidebar = ({
    sidebarOpen,
    setSidebarOpen,
    createNewConversation,
    currentScreen,
    setCurrentScreen,
    SCREENS,
    fileInputRef,
    handleFileSelect,
    conversations,
    currentConversationId,
    editingConversationId,
    editingConversationTitle,
    setEditingConversationTitle,
    loadConversation,
    startEditingConversation,
    saveConversationTitle,
    cancelEditingConversation,
    deleteConversation,
    groupConversationsByDate,
    user,
    authLoading,
    getUserInitials,
    handleSignOut,
    handleGoogleSignIn
}) => {
    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <aside className={`
        fixed lg:sticky top-0 left-0 h-[100dvh]
        ${sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'} 
        bg-[#f9f9f9] dark:bg-[#171717] border-r border-slate-200 dark:border-white/10 
        transition-all duration-300 ease-out z-[70] flex flex-col flex-shrink-0
      `}>
                <div className="p-4 lg:p-3 flex flex-col h-full overflow-hidden">
                    <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'lg:justify-center'} mb-6 px-2`}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center gap-3 group transition-all"
                            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:hidden'}`}>
                                <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" /><circle cx="12" cy="10.5" r="1.5" fill="currentColor" /><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" /></svg>
                                </div>
                                <span className="font-bold text-lg tracking-tight dark:text-white">Zentra Journal</span>
                            </div>
                            <div className={`hidden ${!sidebarOpen && 'lg:flex'} items-center justify-center`}>
                                <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" /><circle cx="12" cy="10.5" r="1.5" fill="currentColor" /><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" /></svg>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-2 mb-6">
                        <button
                            onClick={() => { createNewConversation(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
                            title="New Chat"
                        >
                            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className={`${!sidebarOpen && 'lg:hidden'}`}>New Chat</span>
                        </button>
                        <button
                            onClick={() => {
                                setCurrentScreen(SCREENS.CALENDAR)
                                if (window.innerWidth < 1024) setSidebarOpen(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${currentScreen === SCREENS.CALENDAR ? 'bg-[#10a37f]/10 border-[#10a37f]/30 text-[#10a37f]' : ''} ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
                            title="Calendar"
                        >
                            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className={`${!sidebarOpen && 'lg:hidden'}`}>Calendar</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*,video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            style={{ zIndex: 1001 }}
                        />
                    </div>

                    <div className={`flex-1 overflow-y-auto custom-scrollbar ${!sidebarOpen && 'lg:hidden'} py-4`}>
                        <div className="px-2 mb-6">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Conversations</p>
                            <ConversationList
                                conversations={conversations}
                                currentConversationId={currentConversationId}
                                editingConversationId={editingConversationId}
                                editingConversationTitle={editingConversationTitle}
                                setEditingConversationTitle={setEditingConversationTitle}
                                loadConversation={loadConversation}
                                startEditingConversation={startEditingConversation}
                                saveConversationTitle={saveConversationTitle}
                                cancelEditingConversation={cancelEditingConversation}
                                deleteConversation={deleteConversation}
                                groupByDate={groupConversationsByDate}
                            />
                        </div>
                    </div>

                    <div className="mt-2 mb-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden lg:flex items-center gap-3 p-2 w-full rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-[#10a37f]"
                            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <div className="w-9 h-9 flex items-center justify-center">
                                {sidebarOpen ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" /></svg>
                                )}
                            </div>
                            <span className={`text-sm font-medium ${!sidebarOpen && 'lg:hidden'}`}>
                                {sidebarOpen ? 'Collapse' : 'Expand'}
                            </span>
                        </button>
                    </div>

                    <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-white/10 ${!sidebarOpen && 'lg:border-0'}`}>
                        {user ? (
                            <div className="space-y-2">
                                <div
                                    className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${!sidebarOpen && 'lg:justify-center'}`}
                                >
                                    <div className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-[#10a37f]/20">
                                        {getUserInitials(user)}
                                    </div>
                                    <div className={`min-w-0 flex-1 ${!sidebarOpen && 'lg:hidden'}`}>
                                        <p className="text-xs font-semibold dark:text-white truncate">{user.displayName || user.email}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-xs font-medium ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
                                    title="Sign Out"
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    <span className={`${!sidebarOpen && 'lg:hidden'}`}>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {!authLoading && (
                                    <button
                                        onClick={handleGoogleSignIn}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 bg-[#10a37f] text-white rounded-xl hover:bg-[#0d8a6a] transition-all text-sm font-semibold shadow-lg shadow-[#10a37f]/25 active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
                                        title="Sign In"
                                    >
                                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span className={`${!sidebarOpen && 'lg:hidden'}`}>Sign in</span>
                                    </button>
                                )}
                                {!sidebarOpen && (
                                    <div className="flex justify-center py-2 lg:hidden">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center animate-pulse" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
