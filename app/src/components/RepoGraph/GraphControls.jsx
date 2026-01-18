function GraphControls({
  timestamps,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
}) {
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!timestamps || timestamps.length === 0) {
    return null;
  }

  const minTime = timestamps[0];
  const maxTime = timestamps[timestamps.length - 1];

  // Convert ISO string to slider value (0-100)
  const timeToSlider = (time) => {
    if (!time) return 100;
    const min = new Date(minTime).getTime();
    const max = new Date(maxTime).getTime();
    const current = new Date(time).getTime();
    if (max === min) return 100;
    return ((current - min) / (max - min)) * 100;
  };

  const sliderToTime = (value) => {
    const min = new Date(minTime).getTime();
    const max = new Date(maxTime).getTime();
    const time = min + (value / 100) * (max - min);
    return new Date(time).toISOString();
  };

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
        </select>
      </div>

      <div className="timeline-slider">
        <span className="time-label">{formatDate(minTime)}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={timeToSlider(currentTime)}
          onChange={(e) => onTimeChange(sliderToTime(Number(e.target.value)))}
          className="slider"
        />
        <span className="time-label">{formatDate(maxTime)}</span>
      </div>

      <div className="current-time">Current: {currentTime ? formatDate(currentTime) : "-"}</div>
    </div>
  );
}

export default GraphControls;
