function GraphControls({
  eventCount,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
}) {
  if (!eventCount || eventCount === 0) {
    return null;
  }

  return (
    <div className="graph-controls">
      <div className="timeline-controls">
        <button className="play-button" onClick={onPlayPause}>
          {isPlaying ? "\u23F8 Pause" : "\u25B6 Play"}
        </button>

        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="speed-select"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
          <option value={8}>8x</option>
        </select>
      </div>

      <div className="timeline-slider">
        <span className="time-label">0</span>
        <input
          type="range"
          min={0}
          max={eventCount}
          step={1}
          value={currentIndex ?? eventCount}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="slider"
        />
        <span className="time-label">{eventCount}</span>
      </div>

      <div className="current-time">
        Event: {currentIndex ?? eventCount} / {eventCount}
      </div>
    </div>
  );
}

export default GraphControls;
