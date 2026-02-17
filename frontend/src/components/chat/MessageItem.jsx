import React from 'react';

const MessageItem = ({ msg, user, imageError, setImageError, getUserInitials }) => {
    const isUser = msg.role === 'user';

    return (
        <div className={`flex gap-3 lg:gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
            )}

            <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl shadow-sm ${isUser
                    ? 'bg-[#10a37f] text-white px-4 py-2.5 rounded-br-sm'
                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white/90 px-4 py-3'
                }`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>

            {isUser && (
                <div className="hidden lg:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0 text-xs font-bold mt-1 dark:text-white border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                    {user?.photoURL && !imageError.has('chat') ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-full h-full rounded-full object-cover"
                            onError={() => setImageError(prev => new Set(prev).add('chat'))}
                        />
                    ) : getUserInitials(user)}
                </div>
            )}
        </div>
    );
};

export default MessageItem;
