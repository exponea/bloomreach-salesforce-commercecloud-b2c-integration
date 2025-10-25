/**
 * Mock implementation of dw/system/Site
 * Barebones mock for testing purposes
 */

class SitePreferences {
    constructor(customPrefs = {}) {
        this.customPrefs = customPrefs;
    }

    getCustom() {
        return this.customPrefs;
    }

    getCustomPreferenceValue(key) {
        return this.customPrefs[key];
    }
}

class Site {
    constructor(preferences = {}) {
        this.preferences = new SitePreferences(preferences);
    }

    getPreferences() {
        return this.preferences;
    }

    getCustomPreferenceValue(key) {
        return this.preferences.customPrefs[key];
    }
}

// Mock current site instance
let currentSite = new Site({});

module.exports = {
    getCurrent: function() {
        return currentSite;
    },
    
    // Helper for tests to set mock data
    __setCurrentSite: function(preferences) {
        currentSite = new Site(preferences);
    },
    
    // Helper to reset
    __reset: function() {
        currentSite = new Site({});
    }
};

