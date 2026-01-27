(function() {
  'use strict';

  let deferredPrompt;
  let isStandalone = false;
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    isStandalone = true;
    console.log('[PWA] Running in standalone mode');
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swPath = window.location.pathname.includes('/Legal_Lens/') ? '/Legal_Lens/sw.js' : '/sw.js';
      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); 
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[PWA] New Service Worker found');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New Service Worker activated');
        window.location.reload();
      });
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt triggered');
    
    // Prevent the default browser install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Show custom install button
    showInstallButton();
  });
  function showInstallButton() {
    // Create install button if it doesn't exist
    let installBtn = document.getElementById('pwa-install-btn');
    
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-btn';
      installBtn.innerHTML = `
        <span class="install-icon">📱</span>
        <span class="install-text">Install App</span>
      `;
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .pwa-install-btn {
          position: fixed;
          bottom: 90px;
          right: 30px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 30px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(103, 58, 183, 0.4);
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          animation: slideInRight 0.5s ease;
        }

        .pwa-install-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(103, 58, 183, 0.5);
        }

        .pwa-install-btn:active {
          transform: translateY(-1px);
        }

        .install-icon {
          font-size: 1.2rem;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(150px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .pwa-install-btn {
            bottom: 20px;
            right: 20px;
            font-size: 0.85rem;
            padding: 10px 20px;
          }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(installBtn);
      
      // Add click handler
      installBtn.addEventListener('click', installApp);
    }
    
    installBtn.style.display = 'flex';
  }

  // Install app function
  async function installApp() {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      showInstallSuccessMessage();
    }
    
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Hide the install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  // Show install success message
  function showInstallSuccessMessage() {
    const toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.innerHTML = `
      <span class="toast-icon">✓</span>
      <span>App installed successfully!</span>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .pwa-toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #48bb78;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
      }

      .pwa-toast .toast-icon {
        font-size: 1.5rem;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Show update notification
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <div class="update-text">
          <strong>Update Available</strong>
          <p>A new version is ready!</p>
        </div>
      </div>
      <button class="update-btn" onclick="window.location.reload()">Update Now</button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .pwa-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        max-width: 350px;
        animation: slideInDown 0.5s ease;
        border-left: 4px solid #667eea;
      }

      [data-theme="dark"] .pwa-update-notification {
        background: #2d3748;
        color: white;
      }

      .update-content {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
      }

      .update-icon {
        font-size: 2rem;
      }

      .update-text strong {
        display: block;
        font-size: 1.1rem;
        margin-bottom: 5px;
        color: #667eea;
      }

      [data-theme="dark"] .update-text strong {
        color: #b794f4;
      }

      .update-text p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
      }

      [data-theme="dark"] .update-text p {
        color: #cbd5e0;
      }

      .update-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        transition: all 0.3s;
      }

      .update-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(103, 58, 183, 0.4);
      }

      @keyframes slideInDown {
        from {
          transform: translateY(-100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @media (max-width: 768px) {
        .pwa-update-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
  }

  // Check online/offline status
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    console.log(`[PWA] Connection status: ${isOnline ? 'online' : 'offline'}`);
    
    // Show offline indicator
    if (!isOnline) {
      showOfflineIndicator();
    } else {
      hideOfflineIndicator();
    }
  }

  // Show offline indicator
  function showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.innerHTML = `
        <span>📡</span>
        <span>You're offline - Limited functionality</span>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        #offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #f56565;
          color: white;
          padding: 12px;
          text-align: center;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          z-index: 10002;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          animation: slideInDown 0.3s ease;
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(indicator);
    }
  }

  // Hide offline indicator
  function hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Listen for online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Check initial status
  updateOnlineStatus();

  // App installed handler
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    
    // Hide install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });

  // Expose PWA status
  window.LegalLensPWA = {
    isStandalone,
    isOnline: navigator.onLine,
    canInstall: !!deferredPrompt,
    install: installApp
  };

  console.log('[PWA] PWA handler initialized');
})();
