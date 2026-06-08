import { useState, useEffect } from 'react';
import { Share, X, Download, Smartphone } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Check if previously dismissed or installed
    const isDismissed = localStorage.getItem('pwa_install_prompt_dismissed');
    
    // Check if already in standalone/installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isDismissed || isStandalone) {
      return;
    }

    // Check for iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|chrome|fxios|opera|opios/.test(userAgent);
    
    if (isIOS && isSafari) {
      setTimeout(() => {
        setIsIOSDevice(true);
        setVisible(true);
      }, 0);
      return;
    }

    // Standard Android/Chrome handler
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Optional: Hide if app is successfully installed
    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_install_prompt_dismissed', 'true');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_install_prompt_dismissed', 'true');
    }
    
    // Clear deferred prompt
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_prompt_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-banner glass-card">
        <div className="install-prompt-body">
          <div className="install-prompt-icon">
            <Smartphone size={24} className="text-teal" />
          </div>
          <div className="install-prompt-text">
            <h4>Install Cash Flow</h4>
            {isIOSDevice ? (
              <p className="ios-prompt-desc">
                Tap the share button <Share size={14} className="inline-icon" /> then select <strong>'Add to Home Screen'</strong>.
              </p>
            ) : (
              <p>Install this app on your device for quick access and offline budgeting.</p>
            )}
          </div>
        </div>
        <div className="install-prompt-actions">
          {!isIOSDevice && (
            <button onClick={handleInstallClick} className="install-btn" type="button">
              <Download size={14} />
              <span>Install</span>
            </button>
          )}
          <button onClick={handleDismiss} className="install-close-btn" type="button" aria-label="Dismiss install prompt">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
