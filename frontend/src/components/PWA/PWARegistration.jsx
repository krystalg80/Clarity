import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const PWARegistration = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegistered(swRegistration) {
        console.log('SW registered: ', swRegistration);
      },
      onRegisterError(error) {
        console.log('SW registration error', error);
      },
    });
  }, []);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const updateServiceWorker = () => {
    updateSW();
    close();
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="pwa-update-banner">
      <div className="pwa-update-content">
        {offlineReady && (
          <div className="pwa-message">
            <span>App ready to work offline</span>
            <button onClick={close} className="pwa-close-btn">
              Close
            </button>
          </div>
        )}
        {needRefresh && (
          <div className="pwa-message">
            <span>New content available, click on reload button to update</span>
            <button onClick={updateServiceWorker} className="pwa-update-btn">
              Reload
            </button>
            <button onClick={close} className="pwa-close-btn">
              Close
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .pwa-update-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #6c5ce7;
          color: white;
          padding: 1rem;
          z-index: 9999;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .pwa-update-content {
          max-width: 600px;
          margin: 0 auto;
        }
        
        .pwa-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        
        .pwa-update-btn, .pwa-close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background-color 0.2s;
        }
        
        .pwa-update-btn:hover, .pwa-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        @media (max-width: 768px) {
          .pwa-message {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .pwa-update-btn, .pwa-close-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PWARegistration; 