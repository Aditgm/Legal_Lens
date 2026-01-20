(function() {
    'use strict';
    const getTheme = () => localStorage.getItem('theme') || 'light';
    
    // Set theme and save to localStorage
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateToggleButton(theme);
    };
    const updateToggleButton = (theme) => {
        const button = document.getElementById('theme-toggle');
        if (button) {
            const icon = button.querySelector('.icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        }
    };

    // Toggle theme
    const toggleTheme = () => {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        createThemeChangeEffect(newTheme);
    };

    const createThemeChangeEffect = (theme) => {
        const effect = document.createElement('div');
        effect.className = 'theme-change-effect';
        effect.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            animation: themeFlash 0.5s ease-out;
        `;
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 500);
    };

    const addThemeEffectStyles = () => {
        if (!document.getElementById('theme-effect-styles')) {
            const style = document.createElement('style');
            style.id = 'theme-effect-styles';
            style.textContent = `
                @keyframes themeFlash {
                    0% {
                        background: radial-gradient(circle at center, rgba(102, 126, 234, 0.2) 0%, transparent 50%);
                        opacity: 1;
                    }
                    100% {
                        background: radial-gradient(circle at center, rgba(102, 126, 234, 0) 0%, transparent 50%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    };

    // Initialize theme
    const initTheme = () => {
        const savedTheme = getTheme();
        setTheme(savedTheme);
        addThemeEffectStyles();
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleTheme);
        }
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleTheme();
            }
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Expose toggle function globally for manual use
    window.toggleTheme = toggleTheme;
})();
