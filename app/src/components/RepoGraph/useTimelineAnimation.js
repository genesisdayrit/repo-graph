import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook for managing timeline animation
 */
export function useTimelineAnimation(timestamps, options = {}) {
  const { stepInterval = 500 } = options;

  const [currentTime, setCurrentTime] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef(null);
  const currentIndexRef = useRef(0);

  // Initialize to latest time (show full graph initially)
  useEffect(() => {
    if (timestamps.length > 0 && currentTime === null) {
      setCurrentTime(timestamps[timestamps.length - 1]);
      currentIndexRef.current = timestamps.length - 1;
    }
  }, [timestamps, currentTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || timestamps.length === 0) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const interval = stepInterval / playbackSpeed;

    animationRef.current = setInterval(() => {
      currentIndexRef.current += 1;

      if (currentIndexRef.current >= timestamps.length) {
        setIsPlaying(false);
        currentIndexRef.current = timestamps.length - 1;
      }

      setCurrentTime(timestamps[currentIndexRef.current]);
    }, interval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, timestamps, playbackSpeed, stepInterval]);

  // Handle manual time change
  const handleTimeChange = useCallback(
    (newTime) => {
      const index = timestamps.findIndex((t) => t >= newTime);
      currentIndexRef.current = index >= 0 ? index : timestamps.length - 1;
      setCurrentTime(timestamps[currentIndexRef.current]);
    },
    [timestamps]
  );

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (!isPlaying && currentIndexRef.current >= timestamps.length - 1) {
      // If at end, restart from beginning
      currentIndexRef.current = 0;
      setCurrentTime(timestamps[0]);
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, timestamps]);

  // Reset to beginning
  const reset = useCallback(() => {
    setIsPlaying(false);
    currentIndexRef.current = 0;
    if (timestamps.length > 0) {
      setCurrentTime(timestamps[0]);
    }
  }, [timestamps]);

  // Jump to end (show all)
  const showAll = useCallback(() => {
    setIsPlaying(false);
    currentIndexRef.current = timestamps.length - 1;
    if (timestamps.length > 0) {
      setCurrentTime(timestamps[timestamps.length - 1]);
    }
  }, [timestamps]);

  return {
    currentTime,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    onTimeChange: handleTimeChange,
    onPlayPause: togglePlayPause,
    reset,
    showAll,
  };
}
