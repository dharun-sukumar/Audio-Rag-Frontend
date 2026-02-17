import React from 'react';
import MessageItem from './MessageItem';

const MessageList = ({
    messages,
    isThinking,
    loadingConversation,
    memoriesLoading,
    authLoading,
    memories,
    user,
    imageError,
    setImageError,
    getUserInitials,
    setInputQuery,
    chatEndRef
}) => {
    if (messages.length === 0 && !loadingConversation) {
        return (
            <div className="text-center py-16 lg:py-24 px-4">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#10a37f]/10 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl lg:text-4xl">🎙️</div>
                {memoriesLoading || authLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                ) : memories.length === 0 ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">Hi, I'm here to help you reflect, one day at a time.</h3>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">We'll start with a simple check-in, and over time I'll help summarize how you've been feeling.</p>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-4 font-semibold mb-8">Ready to begin?</p>
                        <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
                            <button
                                onClick={() => setInputQuery("How can I start reflecting today?")}
                                className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium shadow-sm active:scale-95"
                            >
                                How can I start reflecting today?
                            </button>
                            <button
                                onClick={() => setInputQuery("What should I focus on this week?")}
                                className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium shadow-sm active:scale-95"
                            >
                                What should I focus on this week?
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {[
                            { title: 'Summarize', desc: 'Recap my recent transcriptions', query: 'Summarize my recent memories', icon: '📝', color: 'bg-blue-500/10 text-blue-500' },
                            { title: 'Analyze Patterns', desc: 'What themes are emerging?', query: 'What patterns do you notice in my reflections?', icon: '🔍', color: 'bg-purple-500/10 text-purple-500' },
                            { title: 'Track Mood', desc: 'How have I been lately?', query: 'How have I been feeling lately?', icon: '🎭', color: 'bg-amber-500/10 text-amber-500' },
                            { title: 'Action Items', desc: 'What should I do next?', query: 'What should I focus on this week?', icon: '⚡', color: 'bg-[#10a37f]/10 text-[#10a37f]' }
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => setInputQuery(item.query)}
                                className="group p-4 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-[#10a37f]/30 dark:hover:border-[#10a37f]/30 transition-all duration-300 text-left relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="text-[15px] font-bold text-slate-800 dark:text-white mb-0.5">{item.title}</div>
                                        <div className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.desc}</div>
                                    </div>
                                </div>
                                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                                    <svg className="w-4 h-4 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {loadingConversation && messages.length === 0 && (
                <div className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversation...</p>
                    </div>
                </div>
            )}

            {messages.map((msg, i) => (
                <MessageItem
                    key={i}
                    msg={msg}
                    user={user}
                    imageError={imageError}
                    setImageError={setImageError}
                    getUserInitials={getUserInitials}
                />
            ))}

            {isThinking && (
                <div className="flex gap-3 lg:gap-4 animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-1.5 py-3">
                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>
    );
};

export default MessageList;
