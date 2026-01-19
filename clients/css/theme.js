:root {
    --primary-color: #673ab7;
    --primary-dark: #512da8;
    --primary-light: #9575cd;
    --secondary-color: #ffd89b;
    --secondary-dark: #ffb347;
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-secondary: linear-gradient(90deg, #ffd89b 0%, #19547b 100%);
    --bg-light: #f8f9fa;
    --bg-white: #ffffff;
    --bg-body: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --text-dark: #2d3748;
    --text-gray: #4a5568;
    --text-light: #718096;
    --chat-bg: rgba(255, 255, 255, 0.95);
    --message-user-bg: #667eea;
    --message-bot-bg: #f7fafc;
    --message-bot-text: #2d3748;
    --input-bg: #ffffff;
    --input-border: #e2e8f0;
    --success-color: #48bb78;
    --warning-color: #ed8936;
    --error-color: #f56565;
    --info-color: #4299e1;
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;
    --radius-xl: 1.5rem;
    --radius-full: 9999px;
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;
}
[data-theme="dark"] {
    --bg-light: #1a202c;
    --bg-white: #2d3748;
    --bg-body: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
    --text-dark: #e2e8f0;
    --text-gray: #cbd5e0;
    --text-light: #a0aec0;
    --chat-bg: rgba(45, 55, 72, 0.95);
    --message-user-bg: #805ad5;
    --message-bot-bg: #374151;
    --message-bot-text: #e2e8f0;
    --input-bg: #374151;
    --input-border: #4a5568;
    --primary-color: #9f7aea;
    --primary-light: #b794f4;
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.4);
}

.theme-toggle {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--gradient-primary);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: var(--shadow-xl);
    transition: all 0.3s ease;
    z-index: 1000;
}

.theme-toggle:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 25px 30px rgba(0, 0, 0, 0.3);
}

.theme-toggle:active {
    transform: translateY(-1px) scale(0.98);
}

.theme-toggle .icon {
    transition: transform 0.3s ease;
}

.theme-toggle:hover .icon {
    transform: rotate(20deg);
}

body,
.chat-container,
.message,
.input-container,
.modal-content {
    transition: background-color 0.3s ease, color 0.3s ease;
}
@media (prefers-color-scheme: dark) {
    :root {
        --bg-light: #1a202c;
        --bg-white: #2d3748;
        --text-dark: #f7fafc;
        --text-gray: #e2e8f0;
        --text-light: #cbd5e0;
    }
}
.theme-gradient-bg {
    background: var(--gradient-primary);
}

.theme-gradient-text {
    background: var(--gradient-secondary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.theme-card {
    background: var(--bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-xl);
}
.theme-button-primary {
    background: var(--gradient-primary);
    color: white;
    padding: var(--spacing-md) var(--spacing-xl);
    border-radius: var(--radius-full);
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}
.theme-button-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
}
.theme-text-primary {
    color: var(--primary-color);
}

.theme-text-secondary {
    color: var(--secondary-color);
}

.theme-bg-primary {
    background-color: var(--primary-color);
}

.theme-bg-secondary {
    background-color: var(--secondary-color);
}
