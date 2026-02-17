import React from 'react';
import ConversationItem from './ConversationItem';

const ConversationList = ({
    conversations,
    currentConversationId,
    editingConversationId,
    editingConversationTitle,
    loadConversation,
    startEditingConversation,
    saveConversationTitle,
    setEditingConversationTitle,
    cancelEditingConversation,
    deleteConversation,
    groupByDate
}) => {
    const groups = groupByDate(conversations);

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">No conversations yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5">
                        {group.label}
                    </p>
                    {group.conversations.map((conv) => (
                        <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isActive={currentConversationId === conv.id}
                            isEditing={editingConversationId === conv.id}
                            editingTitle={editingConversationTitle}
                            onSelect={loadConversation}
                            onStartEdit={startEditingConversation}
                            onSaveEdit={saveConversationTitle}
                            onCancelEdit={cancelEditingConversation}
                            onDelete={deleteConversation}
                            setEditingTitle={setEditingConversationTitle}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ConversationList;
