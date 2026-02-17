import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioPlayer = (audioUrl) => {
  const audioPlayerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [waveformData, setWaveformData] = useState(new Array(32).fill(0));

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioPlayerRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaElementSource(audioPlayerRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64; // 32 bars
        analyserRef.current.smoothingTimeConstant = 0.8;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    }
  }, []);

  const animateWaveform = useCallback(() => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
      setWaveformData(new Array(32).fill(0));
      return;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    const bars = [];
    const step = Math.floor(dataArrayRef.current.length / 32);
    for (let i = 0; i < 32; i++) {
      const index = i * step;
      const value = dataArrayRef.current[index] || 0;
      bars.push(value / 255);
    }

    setWaveformData(bars);
    animationFrameRef.current = requestAnimationFrame(animateWaveform);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !audioUrl) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setWaveformData(new Array(32).fill(0));
      return;
    }

    initializeAudioContext();
    animateWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, audioUrl, initializeAudioContext, animateWaveform]);

  const togglePlayback = () => {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioPlayerRef.current;
    if (audio) {
      setCurrentPlaybackTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioPlayerRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
  };

  const handleSeek = (e) => {
    const audio = audioPlayerRef.current;
    if (audio) {
      const newTime = parseFloat(e.target.value);
      audio.currentTime = newTime;
      setCurrentPlaybackTime(newTime);
    }
  };

  const seekToTime = (timeMs) => {
    const audio = audioPlayerRef.current;
    if (audio) {
      const timeInSeconds = timeMs / 1000;
      audio.currentTime = timeInSeconds;
      setCurrentPlaybackTime(timeInSeconds);
      if (!isPlaying) {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    audioPlayerRef,
    isPlaying,
    setIsPlaying,
    currentPlaybackTime,
    audioDuration,
    waveformData,
    togglePlayback,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeek,
    seekToTime,
    formatTime
  };
};
