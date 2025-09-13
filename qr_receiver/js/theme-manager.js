/**
 * Theme Manager with System Preference Detection
 * Handles light/dark theme switching with automatic OS preference detection
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'system';
        this.effectiveTheme = 'dark'; // Default
        this.themes = {
            light: {
                name: 'Light',
                icon: '☀️',
                cssClass: 'theme-light'
            },
            dark: {
                name: 'Dark',
                icon: '🌙',
                cssClass: 'theme-dark'
            },
            system: {
                name: 'System',
                icon: '🖥️',
                cssClass: null // Follows system preference
            }
        };
        
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.callbacks = new Set();
        this.storage = null;
        
        this.initialize();
    }
    
    async initialize() {
        // Try to load saved theme preference
        try {
            const storageKey = window.AppConfig?.get('theme.storageKey') || 'qr-scanner-theme';
            const saved = localStorage.getItem(storageKey);
            if (saved && this.themes[saved]) {
                this.currentTheme = saved;
            }
        } catch (e) {
            // LocalStorage might not be available
            console.log('Theme preference storage unavailable');
        }
        
        // Set up system preference listener
        this.mediaQuery.addEventListener('change', (e) => {
            if (this.currentTheme === 'system') {
                this.applyTheme();
            }
        });
        
        // Apply initial theme
        this.applyTheme();
        
        // Set up CSS custom properties for smooth transitions
        this.setupCSSVariables();
    }
    
    setupCSSVariables() {
        // Add CSS variables for theme colors
        const style = document.createElement('style');
        style.textContent = `
            :root {
                /* Light theme colors */
                --light-bg-primary: #FFFFFF;
                --light-bg-secondary: #F5F5F5;
                --light-text-primary: #000000;
                --light-text-secondary: #666666;
                --light-border: #E0E0E0;
                --light-shadow: rgba(0, 0, 0, 0.1);
                --light-overlay: rgba(255, 255, 255, 0.9);
                --light-blur-bg: rgba(255, 255, 255, 0.85);
                
                /* Dark theme colors (existing) */
                --dark-bg-primary: #000000;
                --dark-bg-secondary: #111111;
                --dark-text-primary: #FFFFFF;
                --dark-text-secondary: #AAAAAA;
                --dark-border: #333333;
                --dark-shadow: rgba(0, 0, 0, 0.5);
                --dark-overlay: rgba(0, 0, 0, 0.9);
                --dark-blur-bg: rgba(0, 0, 0, 0.85);
                
                /* Theme transition */
                --theme-transition: 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
            }
            
            /* Theme classes */
            body {
                transition: background-color var(--theme-transition),
                            color var(--theme-transition);
            }
            
            body.theme-light {
                --bg-primary: var(--light-bg-primary);
                --bg-secondary: var(--light-bg-secondary);
                --text-primary: var(--light-text-primary);
                --text-secondary: var(--light-text-secondary);
                --border-color: var(--light-border);
                --shadow-color: var(--light-shadow);
                --overlay-bg: var(--light-overlay);
                --blur-bg: var(--light-blur-bg);
                
                background: var(--bg-primary);
                color: var(--text-primary);
            }
            
            body.theme-dark {
                --bg-primary: var(--dark-bg-primary);
                --bg-secondary: var(--dark-bg-secondary);
                --text-primary: var(--dark-text-primary);
                --text-secondary: var(--dark-text-secondary);
                --border-color: var(--dark-border);
                --shadow-color: var(--dark-shadow);
                --overlay-bg: var(--dark-overlay);
                --blur-bg: var(--dark-blur-bg);
                
                background: var(--bg-primary);
                color: var(--text-primary);
            }
            
            /* Update existing components to use theme variables */
            .loading-screen {
                background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
            }
            
            .top-bar, .bottom-panel {
                background: var(--blur-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }
            
            .transfer-status {
                background: var(--overlay-bg);
                color: var(--text-primary);
            }
            
            .action-btn.secondary {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            
            /* Light theme specific adjustments */
            body.theme-light .scan-frame {
                box-shadow: 0 0 0 9999px rgba(255, 255, 255, 0.85);
            }
            
            body.theme-light .loading-spinner {
                border-color: var(--border-color);
                border-top-color: var(--primary-blue);
            }
            
            body.theme-light .chunk-indicator {
                box-shadow: 0 1px 2px var(--shadow-color);
            }
            
            /* Theme toggle button */
            .theme-toggle {
                position: fixed;
                top: var(--safe-area-top, 20px);
                right: 60px;
                width: 44px;
                height: 44px;
                border-radius: 22px;
                background: var(--blur-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: none;
                color: var(--text-primary);
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all var(--transition-fast);
                z-index: 91;
                -webkit-tap-highlight-color: transparent;
            }
            
            .theme-toggle:active {
                transform: scale(0.95);
            }
            
            /* Theme menu */
            .theme-menu {
                position: fixed;
                top: calc(var(--safe-area-top, 20px) + 54px);
                right: 60px;
                background: var(--blur-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 12px;
                padding: 8px;
                box-shadow: 0 4px 12px var(--shadow-color);
                z-index: 100;
                opacity: 0;
                transform: scale(0.9) translateY(-10px);
                pointer-events: none;
                transition: all var(--transition-fast);
            }
            
            .theme-menu.visible {
                opacity: 1;
                transform: scale(1) translateY(0);
                pointer-events: auto;
            }
            
            .theme-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: background var(--transition-fast);
                color: var(--text-primary);
                font-size: 15px;
                white-space: nowrap;
            }
            
            .theme-option:hover {
                background: var(--bg-secondary);
            }
            
            .theme-option.active {
                background: var(--primary-blue);
                color: white;
            }
            
            .theme-option .icon {
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);
    }
    
    setTheme(theme) {
        if (!this.themes[theme]) {
            console.warn(`Unknown theme: ${theme}`);
            return;
        }
        
        this.currentTheme = theme;
        
        // Save preference
        try {
            const storageKey = window.AppConfig?.get('theme.storageKey') || 'qr-scanner-theme';
            localStorage.setItem(storageKey, theme);
        } catch (e) {
            // Storage might not be available
        }
        
        this.applyTheme();
        this.notifyCallbacks();
    }
    
    applyTheme() {
        // Remove all theme classes
        document.body.classList.remove('theme-light', 'theme-dark');
        
        // Determine effective theme
        if (this.currentTheme === 'system') {
            this.effectiveTheme = this.mediaQuery.matches ? 'dark' : 'light';
        } else {
            this.effectiveTheme = this.currentTheme;
        }
        
        // Apply theme class
        document.body.classList.add(`theme-${this.effectiveTheme}`);
        
        // Update meta theme color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = this.effectiveTheme === 'dark' ? '#000000' : '#FFFFFF';
        }
        
        // Update status bar style for iOS
        const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (statusBar) {
            statusBar.content = this.effectiveTheme === 'dark' ? 'black-translucent' : 'default';
        }
        
        console.log(`🎨 Theme applied: ${this.currentTheme} (effective: ${this.effectiveTheme})`);
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    getEffectiveTheme() {
        return this.effectiveTheme;
    }
    
    cycleTheme() {
        const themes = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }
    
    createToggleButton() {
        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.id = 'themeToggle';
        button.title = 'Change theme';
        button.innerHTML = this.themes[this.currentTheme].icon;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showThemeMenu();
        });
        
        return button;
    }
    
    createThemeMenu() {
        const menu = document.createElement('div');
        menu.className = 'theme-menu';
        menu.id = 'themeMenu';
        
        Object.entries(this.themes).forEach(([key, theme]) => {
            const option = document.createElement('div');
            option.className = 'theme-option';
            if (key === this.currentTheme) {
                option.classList.add('active');
            }
            
            option.innerHTML = `
                <span class="icon">${theme.icon}</span>
                <span>${theme.name}</span>
            `;
            
            option.addEventListener('click', () => {
                this.setTheme(key);
                this.hideThemeMenu();
                this.updateUI();
            });
            
            menu.appendChild(option);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-toggle') && !e.target.closest('.theme-menu')) {
                this.hideThemeMenu();
            }
        });
        
        return menu;
    }
    
    showThemeMenu() {
        const menu = document.getElementById('themeMenu');
        if (menu) {
            menu.classList.add('visible');
        }
    }
    
    hideThemeMenu() {
        const menu = document.getElementById('themeMenu');
        if (menu) {
            menu.classList.remove('visible');
        }
    }
    
    updateUI() {
        // Update toggle button icon
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = this.themes[this.currentTheme].icon;
        }
        
        // Update active menu option
        const options = document.querySelectorAll('.theme-option');
        options.forEach((option, index) => {
            const themes = Object.keys(this.themes);
            if (themes[index] === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    onThemeChange(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }
    
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.currentTheme, this.effectiveTheme);
            } catch (e) {
                console.error('Theme change callback error:', e);
            }
        });
    }
    
    // Check if user prefers reduced motion
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    
    // Get theme-appropriate colors
    getThemeColors() {
        const isDark = this.effectiveTheme === 'dark';
        return {
            primary: isDark ? '#007AFF' : '#0051D5',
            success: isDark ? '#30D158' : '#28A745',
            warning: isDark ? '#FF9500' : '#F77F00',
            error: isDark ? '#FF453A' : '#DC3545',
            background: isDark ? '#000000' : '#FFFFFF',
            text: isDark ? '#FFFFFF' : '#000000',
            secondaryText: isDark ? '#AAAAAA' : '#666666',
            border: isDark ? '#333333' : '#E0E0E0'
        };
    }
}

// Export for ES6 modules
export { ThemeManager };