import React, { forwardRef, useImperativeHandle } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

const AudioPlayer = forwardRef(({
    audioUrl,
    onEnded,
    onTimeUpdate,
    className = ""
}, ref) => {
    const {
        audioPlayerRef,
        isPlaying,
        setIsPlaying,
        currentPlaybackTime,
        audioDuration,
        waveformData,
        togglePlayback,
        handleTimeUpdate: originalHandleTimeUpdate,
        handleLoadedMetadata,
        handleSeek: originalHandleSeek,
        seekToTime,
        formatTime
    } = useAudioPlayer(audioUrl);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        togglePlayback,
        seekToTime,
        get audio() { return audioPlayerRef.current; }
    }));

    const onAudioEnded = () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
    };

    const handleTimeUpdate = () => {
        originalHandleTimeUpdate();
        if (onTimeUpdate && audioPlayerRef.current) {
            onTimeUpdate(audioPlayerRef.current.currentTime);
        }
    };

    const handleSeek = (e) => {
        originalHandleSeek(e);
        if (onTimeUpdate) {
            onTimeUpdate(parseFloat(e.target.value));
        }
    };

    if (!audioUrl) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Play/Pause and Seek Bar */}
            <div className="flex items-center gap-4">
                <button
                    onClick={togglePlayback}
                    className="w-12 h-12 flex items-center justify-center bg-[#10a37f] text-white rounded-full hover:bg-[#0d8a6a] transition-all shadow-lg active:scale-95 flex-shrink-0"
                >
                    {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                <div className="flex-1 space-y-1">
                    <input
                        type="range"
                        min="0"
                        max={audioDuration || 0}
                        step="0.01"
                        value={currentPlaybackTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#10a37f]"
                    />
                    <div className="flex justify-between items-center px-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {formatTime(currentPlaybackTime)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {formatTime(audioDuration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Waveform Visualization */}
            <div className="flex items-end justify-center gap-0.5 h-10">
                {waveformData.map((value, index) => (
                    <div
                        key={index}
                        className="flex-1 bg-[#10a37f] rounded-t transition-all duration-75 ease-out"
                        style={{
                            height: isPlaying ? `${Math.max(3, value * 100)}%` : '3px',
                            opacity: isPlaying ? 0.6 + (value * 0.4) : 0.2,
                            minHeight: '3px'
                        }}
                    />
                ))}
            </div>

            {/* Hidden audio element */}
            <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={onAudioEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="metadata"
                crossOrigin="anonymous"
                className="hidden"
            />
        </div>
    );
});

export default AudioPlayer;
