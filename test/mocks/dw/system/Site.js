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

    setCustomPreferenceValue(key, value) {
        this.preferences.customPrefs[key] = value;
    }

    getCalendar() {
        return {
            getTime: function() {
                return new Date();
            }
        };
    }
}

// Static property for Site.current
Site.current = null;

// Mock current site instance
let currentSite = new Site({});
Site.current = currentSite;

module.exports = {
    getCurrent: function() {
        return currentSite;
    },
    
    // Static current property
    get current() {
        return currentSite;
    },
    
    // Helper for tests to set mock data
    __setCurrentSite: function(preferences) {
        currentSite = new Site(preferences);
        Site.current = currentSite;
    },
    
    // Helper to reset
    __reset: function() {
        currentSite = new Site({});
        Site.current = currentSite;
    }
};

