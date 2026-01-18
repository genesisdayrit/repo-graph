import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook for managing timeline animation (event-based, not timestamp-based)
 * @param eventCount - total number of events
 */
export function useTimelineAnimation(eventCount, options = {}) {
  const { stepInterval = 100 } = options; // Fast by default for smooth animation

  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef(null);

  // Initialize to show full graph (all events)
  useEffect(() => {
    if (eventCount > 0 && currentIndex === null) {
      setCurrentIndex(eventCount);
    }
  }, [eventCount, currentIndex]);

  // Animation loop - advance one event at a time
  useEffect(() => {
    if (!isPlaying || eventCount === 0) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const interval = stepInterval / playbackSpeed;

    animationRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev ?? 0) + 1;
        if (next >= eventCount) {
          setIsPlaying(false);
          return eventCount;
        }
        return next;
      });
    }, interval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, eventCount, playbackSpeed, stepInterval]);

  // Handle manual index change (from slider)
  const handleIndexChange = useCallback(
    (newIndex) => {
      setCurrentIndex(Math.min(Math.max(0, newIndex), eventCount));
    },
    [eventCount]
  );

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (!isPlaying && currentIndex >= eventCount) {
      // If at end, restart from beginning
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, currentIndex, eventCount]);

  // Reset to beginning
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  // Jump to end (show all)
  const showAll = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(eventCount);
  }, [eventCount]);

  return {
    currentIndex,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    onIndexChange: handleIndexChange,
    onPlayPause: togglePlayPause,
    reset,
    showAll,
  };
}
