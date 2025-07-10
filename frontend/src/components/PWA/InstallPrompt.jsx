import { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceType, setDeviceType] = useState('unknown');

  useEffect(() => {
    // Detect device type
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isDesktop = !isIOS && !isAndroid;

    if (isIOS) setDeviceType('ios');
    else if (isAndroid) setDeviceType('android');
    else setDeviceType('desktop');

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show manual install prompt for iOS after a delay
    if (isIOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const getInstallInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return {
          title: 'Add Clarity to Home Screen',
          steps: [
            'Tap the Share button (📤) at the bottom',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to install'
          ],
          icon: '📱'
        };
      case 'android':
        return {
          title: 'Install Clarity App',
          steps: [
            'Tap "Install" below to add to home screen',
            'Or use the menu (⋮) → "Add to Home Screen"'
          ],
          icon: '🤖'
        };
      case 'desktop':
        return {
          title: 'Install Clarity App',
          steps: [
            'Click the install icon (📥) in your browser address bar',
            'Or use the menu → "Install Clarity"'
          ],
          icon: '💻'
        };
      default:
        return {
          title: 'Install Clarity',
          steps: [
            'Look for an install option in your browser menu',
            'Or add this page to your bookmarks'
          ],
          icon: '📱'
        };
    }
  };

  const instructions = getInstallInstructions();

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <button className="install-close" onClick={handleClose}>
          ✕
        </button>
        
        <div className="install-content">
          <div className="install-icon">{instructions.icon}</div>
          <h3>{instructions.title}</h3>
          
          <div className="install-steps">
            {instructions.steps.map((step, index) => (
              <div key={index} className="install-step">
                <span className="step-number">{index + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>

          {deviceType === 'android' && deferredPrompt && (
            <button className="install-button" onClick={handleInstallClick}>
              Install Clarity
            </button>
          )}

          <div className="install-benefits">
            <p>✨ Works offline • 🚀 Faster loading • 📱 App-like experience</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .install-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .install-prompt {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .install-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 4px;
        }

        .install-content {
          text-align: center;
        }

        .install-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .install-content h3 {
          color: #6b8069;
          margin-bottom: 20px;
          font-size: 20px;
        }

        .install-steps {
          text-align: left;
          margin-bottom: 20px;
        }

        .install-step {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
        }

        .step-number {
          background: #6b8069;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .step-text {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .install-button {
          background: #6b8069;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin-bottom: 16px;
          transition: background-color 0.2s;
        }

        .install-button:hover {
          background: #556b54;
        }

        .install-benefits {
          background: #f6f7f6;
          border-radius: 8px;
          padding: 12px;
        }

        .install-benefits p {
          color: #6b8069;
          font-size: 12px;
          margin: 0;
        }

        @media (max-width: 480px) {
          .install-prompt {
            margin: 20px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt; 