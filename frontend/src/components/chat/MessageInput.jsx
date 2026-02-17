import React, { useState, useEffect } from 'react';

const MessageInput = ({
    inputQuery,
    setInputQuery,
    askQuestion,
    isThinking,
    textareaRef,
    requireAuth,
    setCurrentScreen,
    SCREENS,
    fileInputRef
}) => {
    const [showCreateMemoryDropdown, setShowCreateMemoryDropdown] = useState(false);

    // Auto-expand textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
        }
    }, [inputQuery, textareaRef]);

    // Handle outside click for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showCreateMemoryDropdown && !event.target.closest('.create-memory-dropdown')) {
                setShowCreateMemoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCreateMemoryDropdown]);

    const handleCreateAction = async (action, screen) => {
        if (await requireAuth(`create ${action}`)) {
            if (screen) setCurrentScreen(screen);
            else if (action === 'upload') fileInputRef.current.click();
            setShowCreateMemoryDropdown(false);
        }
    };

    return (
        <div className="relative flex items-end bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[28px] shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-[#10a37f]/50 dark:focus-within:border-[#10a37f]/50 transition-all duration-300">
            {/* Create Memory Dropdown Button */}
            <div className="absolute left-2 bottom-2 z-10 create-memory-dropdown">
                <button
                    onClick={() => setShowCreateMemoryDropdown(!showCreateMemoryDropdown)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${showCreateMemoryDropdown
                            ? 'bg-[#10a37f] text-white shadow-md'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    title="Create Memory"
                >
                    <svg className="w-5 h-5 transition-transform duration-200" style={{ transform: showCreateMemoryDropdown ? 'rotate(45deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>

                {showCreateMemoryDropdown && (
                    <div className="absolute bottom-full left-0 mb-3 w-72 bg-white dark:bg-[#262626] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2">
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                                Actions
                            </div>
                            <button
                                onClick={() => handleCreateAction('record', SCREENS.RECORD)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group/item"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#10a37f]/10 dark:bg-[#10a37f]/20 flex items-center justify-center group-hover/item:bg-[#10a37f]/20 dark:group-hover/item:bg-[#10a37f]/30 transition-colors">
                                    <svg className="w-5 h-5 text-[#10a37f]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white">Record Audio</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capture a new memory by voice</div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleCreateAction('upload')}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group/item"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center group-hover/item:bg-blue-500/20 dark:group-hover/item:bg-blue-500/30 transition-colors">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white">Upload File</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Import audio or video files</div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleCreateAction('text', SCREENS.CREATE_TEXT_MEMORY)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group/item"
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center group-hover/item:bg-purple-500/20 dark:group-hover/item:bg-purple-500/30 transition-colors">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white">Write Memory</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Create a text-only memory</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askQuestion())}
                placeholder="Message AudioRag..."
                className="w-full pl-14 pr-14 py-[14px] bg-transparent border-none resize-none text-[16px] leading-[1.6] placeholder-slate-400 dark:placeholder-slate-500 dark:text-white/90 focus:outline-none focus:ring-0 overflow-y-auto min-h-[56px]"
                rows="1"
                style={{ maxHeight: '300px' }}
            />

            {/* Send button */}
            <div className="absolute right-2 bottom-2">
                <button
                    onClick={askQuestion}
                    disabled={!inputQuery.trim() || isThinking}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${inputQuery.trim() && !isThinking
                            ? 'bg-[#10a37f] text-white shadow-md hover:bg-[#0d8a6a] hover:scale-105 active:scale-95'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-white/10'
                        }`}
                >
                    {isThinking ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s]"></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]"></div>
                        </div>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default MessageInput;
