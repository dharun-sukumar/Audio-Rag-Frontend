import React, { memo } from 'react';

const DateDetailsModal = memo(({
    showDateDetailsModal,
    selectedDateDetails,
    setShowDateDetailsModal,
    viewMemoryDetail
}) => {
    if (!showDateDetailsModal || !selectedDateDetails) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowDateDetailsModal(false)}
            />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[80vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">
                            {new Date(selectedDateDetails.date).toLocaleDateString('default', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {selectedDateDetails.total_count} {selectedDateDetails.total_count === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDateDetailsModal(false)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    {/* Memories */}
                    {selectedDateDetails.memories && selectedDateDetails.memories.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>📝</span>
                                Memories ({selectedDateDetails.memories.length})
                            </h3>
                            <div className="space-y-2">
                                {selectedDateDetails.memories.map((memory) => (
                                    <div
                                        key={memory.id}
                                        onClick={() => {
                                            viewMemoryDetail(memory);
                                            setShowDateDetailsModal(false);
                                        }}
                                        className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#10a37f] dark:hover:border-[#10a37f] cursor-pointer transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
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
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                                                            {memory.title || 'Untitled Memory'}
                                                        </h4>
                                                        {memory.mood && (
                                                            <span className="text-sm flex-shrink-0">
                                                                {['😢', '😕', '😐', '🙂', '😄'][memory.mood - 1]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        {memory.description || memory.topic || 'No description'}
                                                    </p>
                                                    {memory.tags && memory.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {memory.tags.slice(0, 3).map((tag) => (
                                                                <span
                                                                    key={tag.id}
                                                                    className="text-[10px] px-2 py-0.5 rounded-full"
                                                                    style={{
                                                                        backgroundColor: `${tag.color}20`,
                                                                        color: tag.color
                                                                    }}
                                                                >
                                                                    {tag.name}
                                                                </span>
                                                            ))}
                                                            {memory.tags.length > 3 && (
                                                                <span className="text-[10px] text-slate-400">+{memory.tags.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400 flex-shrink-0">
                                                {new Date(memory.created_at || memory.memory_date).toLocaleTimeString('default', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Legacy Recordings */}
                    {selectedDateDetails.recordings && selectedDateDetails.recordings.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>🎙️</span>
                                Recordings ({selectedDateDetails.recordings.length})
                            </h3>
                            <div className="space-y-2">
                                {selectedDateDetails.recordings.map((rec) => (
                                    <div
                                        key={rec.id || rec.document_id}
                                        onClick={() => {
                                            viewMemoryDetail(rec);
                                            setShowDateDetailsModal(false);
                                        }}
                                        className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#10a37f] dark:hover:border-[#10a37f] cursor-pointer transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-800 dark:text-white mb-1">
                                                    {rec.filename}
                                                </h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className={`px-2 py-0.5 rounded-full ${rec.status === 'indexed'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                        }`}>
                                                        {rec.status}
                                                    </span>
                                                    {rec.has_transcription && (
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Transcribed
                                                        </span>
                                                    )}
                                                    {rec.duration_seconds && (
                                                        <span>{Math.floor(rec.duration_seconds / 60)}m {rec.duration_seconds % 60}s</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(rec.created_at).toLocaleTimeString('default', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedDateDetails.total_count === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">No activity on this date</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

DateDetailsModal.displayName = 'DateDetailsModal';

export default DateDetailsModal;
