export function RealtimeIndicator({ status }) {
  const isConnected = status === 'connected';

  return (
    <div className="realtime-indicator" title={isConnected ? 'Connected to real-time sync' : 'Reconnecting to real-time sync...'}>
      <span className={`indicator-dot ${isConnected ? 'live' : 'reconnecting'}`}></span>
      <span className="indicator-text">
        {isConnected ? 'Live' : 'Reconnecting...'}
      </span>
    </div>
  );
}

export default RealtimeIndicator;
