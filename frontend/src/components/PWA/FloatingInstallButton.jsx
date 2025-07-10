import { useState, useEffect } from 'react';

const FloatingInstallButton = () => {
  const [showButton, setShowButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show button for iOS after a delay (iOS doesn't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isInstalled) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowButton(false);
        setDeferredPrompt(null);
      }
    } else {
      // For iOS or other browsers, show instructions
      alert('To install: Use your browser menu → "Add to Home Screen" or "Install App"');
    }
  };

  if (!showButton || isInstalled) return null;

  return (
    <div className="floating-install-button" onClick={handleInstallClick}>
      <div className="install-icon">📱</div>
      <span className="install-text">Install</span>
      
      <style jsx>{`
        .floating-install-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #6b8069;
          color: white;
          border-radius: 50px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(107, 128, 105, 0.3);
          z-index: 1000;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 14px;
        }

        .floating-install-button:hover {
          background: #556b54;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(107, 128, 105, 0.4);
        }

        .floating-install-button:active {
          transform: translateY(0);
        }

        .install-icon {
          font-size: 18px;
        }

        .install-text {
          white-space: nowrap;
        }

        @media (max-width: 480px) {
          .floating-install-button {
            bottom: 16px;
            right: 16px;
            padding: 10px 16px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingInstallButton; 