import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from '../hooks/useToast';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState('offline'); // 'offline' or 'online'

  useEffect(() => {
    let timer;
    const updateStatus = setTimeout(() => {
      if (!isOnline) {
        setStatusType('offline');
        setStatusText("You're offline — changes will sync when reconnected");
        setVisible(true);
        showToast("You're offline. App is running in offline cache mode.", "warning");
      } else {
        if (visible) {
          setStatusType('online');
          setStatusText("Connected! Database synchronized.");
          showToast("You're back online! Syncing data...", "success");
          timer = setTimeout(() => {
            setVisible(false);
          }, 3000);
        }
      }
    }, 0);

    return () => {
      clearTimeout(updateStatus);
      if (timer) clearTimeout(timer);
    };
  }, [isOnline, showToast, visible]);

  if (!visible) return null;

  return (
    <div className={`offline-banner-wrap ${statusType}`}>
      <div className="offline-banner-content">
        {statusType === 'online' ? (
          <Wifi size={14} className="banner-icon-svg" />
        ) : (
          <WifiOff size={14} className="banner-icon-svg" />
        )}
        <span>{statusText}</span>
      </div>
    </div>
  );
}

export default OfflineBanner;
