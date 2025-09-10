// URL Parameter Watcher Utility
// This utility provides more robust parameter change detection

class URLParameterWatcher {
    constructor(callback, watchedParams = ['collegeId', 'user1Id', 'branch']) {
        this.callback = callback;
        this.watchedParams = watchedParams;
        this.currentParams = {};
        this.isWatching = false;
        
        this.updateCurrentParams();
        this.startWatching();
    }

    // Extract current parameters
    updateCurrentParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const newParams = {};
        
        this.watchedParams.forEach(param => {
            newParams[param] = urlParams.get(param) || '';
        });
        
        this.currentParams = newParams;
    }

    // Check if parameters have changed
    hasParametersChanged() {
        const urlParams = new URLSearchParams(window.location.search);
        
        return this.watchedParams.some(param => {
            const currentValue = urlParams.get(param) || '';
            return currentValue !== this.currentParams[param];
        });
    }

    // Start watching for changes
    startWatching() {
        if (this.isWatching) return;
        
        this.isWatching = true;
        
        // Watch for popstate events (back/forward navigation)
        window.addEventListener('popstate', () => {
            this.checkAndNotifyChanges();
        });
        
        // Watch for hashchange events
        window.addEventListener('hashchange', () => {
            this.checkAndNotifyChanges();
        });
        
        // Poll for changes (fallback method)
        this.pollingInterval = setInterval(() => {
            this.checkAndNotifyChanges();
        }, 1000);
        
        // Use MutationObserver to watch for programmatic URL changes
        this.setupMutationObserver();
    }

    // Setup mutation observer for programmatic changes
    setupMutationObserver() {
        if (typeof MutationObserver === 'undefined') return;
        
        this.observer = new MutationObserver((mutations) => {
            // Check if any script tags or elements that might change URL were modified
            let shouldCheck = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);
                    
                    const relevantChanges = [...addedNodes, ...removedNodes].some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'SCRIPT' || node.tagName === 'A')
                    );
                    
                    if (relevantChanges) shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                setTimeout(() => this.checkAndNotifyChanges(), 100);
            }
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Check for changes and notify callback
    checkAndNotifyChanges() {
        if (this.hasParametersChanged()) {
            const oldParams = { ...this.currentParams };
            this.updateCurrentParams();
            
            console.log('URL parameters changed:', {
                old: oldParams,
                new: this.currentParams
            });
            
            this.callback(this.currentParams, oldParams);
        }
    }

    // Stop watching for changes
    stopWatching() {
        if (!this.isWatching) return;
        
        this.isWatching = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Remove event listeners
        window.removeEventListener('popstate', this.checkAndNotifyChanges);
        window.removeEventListener('hashchange', this.checkAndNotifyChanges);
    }

    // Get current parameters
    getCurrentParams() {
        return { ...this.currentParams };
    }

    // Manually trigger a check
    forceCheck() {
        this.checkAndNotifyChanges();
    }
}

// Usage example:
// const watcher = new URLParameterWatcher((newParams, oldParams) => {
//     console.log('Parameters changed!', newParams);
//     loadExams(); // Your reload function
// });

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLParameterWatcher;
} else {
    window.URLParameterWatcher = URLParameterWatcher;
}