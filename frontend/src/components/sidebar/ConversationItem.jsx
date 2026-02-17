import React from 'react';

const ConversationItem = ({
    conv,
    isActive,
    isEditing,
    editingTitle,
    onSelect,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    setEditingTitle
}) => {
    return (
        <div
            onClick={() => !isEditing && onSelect(conv)}
            className={`group flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 border transition-all ${isEditing ? 'cursor-default' : 'cursor-pointer'
                } ${isActive
                    ? 'bg-[#10a37f]/10 border-[#10a37f]/30'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-white/10'
                }`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive
                    ? 'bg-[#10a37f] text-white'
                    : 'bg-blue-500/10 text-blue-500'
                    }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => onSaveEdit(conv.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveEdit(conv.id)
                                if (e.key === 'Escape') onCancelEdit()
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs font-semibold dark:text-white bg-white dark:bg-slate-800 border-2 border-[#10a37f]/50 rounded-lg px-2 py-1 focus:outline-none focus:border-[#10a37f] transition-all shadow-sm"
                            autoFocus
                        />
                    ) : (
                        <>
                            <p className="text-xs font-semibold dark:text-white truncate">{conv.title || 'Untitled Chat'}</p>
                            <p className="text-[10px] text-slate-500">{conv.message_count || 0} messages</p>
                        </>
                    )}
                </div>
            </div>
            {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={(e) => onStartEdit(conv, e)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-[#10a37f] rounded-lg transition-all"
                        title="Rename conversation"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => onDelete(conv.id, e)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                        title="Delete conversation"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConversationItem;
