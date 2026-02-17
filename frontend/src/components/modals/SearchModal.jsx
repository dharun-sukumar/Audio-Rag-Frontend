import React, { memo, useRef, useEffect } from 'react';

const SearchModal = memo(({
    showSearchModal,
    setShowSearchModal,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    loadConversation,
    viewMemoryDetail
}) => {
    if (!showSearchModal) return null;

    const searchInputRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (showSearchModal && searchInputRef.current) {
            const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [showSearchModal]);

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearchModal(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-fade-in">
                {/* Search Input */}
                <div className="p-4 border-b border-slate-200 dark:border-white/10">
                    <div className="relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations and memories..."
                            className="w-full px-4 py-4 pl-12 pr-20 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl text-[16px] focus:outline-none focus:ring-2 focus:ring-[#10a37f] dark:text-white transition-all shadow-inner"
                        />
                        <svg className="w-6 h-6 absolute left-4 top-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <div className="absolute right-4 top-4 flex items-center gap-1.5 pt-0.5">
                            <kbd className="px-2 py-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-400 dark:text-slate-500 shadow-sm uppercase tracking-wider">Esc</kbd>
                        </div>
                    </div>
                </div>

                {/* Search Results */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-2 border-[#10a37f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Searching...</p>
                        </div>
                    ) : searchQuery.trim() === '' ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Start typing to search conversations and memories</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-xs">⌘K</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-xs">Ctrl+K</kbd> to open this search</p>
                        </div>
                    ) : (searchResults.conversations?.length === 0 && searchResults.memories?.length === 0) ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {/* Conversations Results */}
                            {searchResults.conversations?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
                                        Conversations ({searchResults.conversations.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {searchResults.conversations.map((conv) => (
                                            <button
                                                key={conv.id}
                                                onClick={() => {
                                                    loadConversation(conv);
                                                    setShowSearchModal(false);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                            {conv.title || 'Untitled Chat'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {conv.message_count || 0} messages
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Memories Results */}
                            {searchResults.memories?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
                                        Memories ({searchResults.memories.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {searchResults.memories.map((memory) => (
                                            <button
                                                key={memory.id}
                                                onClick={() => {
                                                    viewMemoryDetail(memory);
                                                    setShowSearchModal(false);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${memory.media_type === 'video' ? 'bg-blue-500/10 text-blue-500' :
                                                        memory.media_type === 'text' ? 'bg-orange-500/10 text-orange-500' :
                                                            'bg-purple-500/10 text-purple-500'
                                                        }`}>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {memory.media_type === 'video' ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            ) : memory.media_type === 'text' ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                            )}
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                            {memory.title || 'Untitled Memory'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                            {memory.description || memory.topic || 'No description'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

SearchModal.displayName = 'SearchModal';

export default SearchModal;
