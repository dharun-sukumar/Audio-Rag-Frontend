import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatContainer = ({
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
    chatEndRef,
    inputQuery,
    askQuestion,
    textareaRef,
    requireAuth,
    setCurrentScreen,
    SCREENS,
    fileInputRef,
    headerJSX
}) => {
    return (
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
            {headerJSX}

            <div className="flex-1 overflow-y-auto px-4 lg:px-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto py-8 lg:py-12 pb-24">
                    <MessageList
                        messages={messages}
                        isThinking={isThinking}
                        loadingConversation={loadingConversation}
                        memoriesLoading={memoriesLoading}
                        authLoading={authLoading}
                        memories={memories}
                        user={user}
                        imageError={imageError}
                        setImageError={setImageError}
                        getUserInitials={getUserInitials}
                        setInputQuery={setInputQuery}
                        chatEndRef={chatEndRef}
                    />
                </div>
            </div>

            <div className="px-4 lg:px-8 pb-6 pb-safe-bottom pt-2 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white/95 dark:via-[#0d0d0d]/95 to-transparent">
                <div className="max-w-3xl mx-auto">
                    <MessageInput
                        inputQuery={inputQuery}
                        setInputQuery={setInputQuery}
                        askQuestion={askQuestion}
                        isThinking={isThinking}
                        textareaRef={textareaRef}
                        requireAuth={requireAuth}
                        setCurrentScreen={setCurrentScreen}
                        SCREENS={SCREENS}
                        fileInputRef={fileInputRef}
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatContainer;
