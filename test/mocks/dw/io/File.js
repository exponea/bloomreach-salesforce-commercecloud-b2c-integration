/**
 * Mock implementation of dw/io/File
 * Provides file system operations for testing purposes
 */

const path = require('path');

class File {
    constructor(parentOrPath, name) {
        if (typeof parentOrPath === 'string') {
            // Constructor with path only
            this.fullPath = parentOrPath;
            this.name = path.basename(parentOrPath);
        } else if (parentOrPath && typeof parentOrPath === 'object' && parentOrPath.fullPath && name) {
            // Constructor with parent File/directory object and name
            this.fullPath = path.join(parentOrPath.fullPath, name);
            this.name = name;
        } else {
            throw new Error('Invalid File constructor arguments');
        }
        
        this._exists = true; // Default to true for testing
        this._isDirectory = false;
        this._length = 0;
    }

    exists() {
        return this._exists;
    }

    isDirectory() {
        return this._isDirectory;
    }

    isFile() {
        return this._exists && !this._isDirectory;
    }

    getName() {
        return this.name;
    }

    getFullPath() {
        return this.fullPath;
    }

    length() {
        return this._length;
    }

    mkdirs() {
        this._exists = true;
        this._isDirectory = true;
        return true;
    }

    mkdir() {
        this._exists = true;
        this._isDirectory = true;
        return true;
    }

    remove() {
        this._exists = false;
        return true;
    }

    list() {
        // Returns array of file names in directory
        return [];
    }

    listFiles() {
        // Returns array of File objects
        return [];
    }

    toString() {
        return this.fullPath;
    }
}

// Static methods and constants
File.SEPARATOR = '/';
File.IMPEX = 'IMPEX';
File.STATIC = 'STATIC';
File.TEMP = 'TEMP';
File.CATALOGS = 'CATALOGS';
File.LIBRARIES = 'LIBRARIES';

/**
 * Gets the root directory for a given location
 * @param {string} location - The location constant (IMPEX, STATIC, etc.)
 * @returns {File} Root directory file
 */
File.getRootDirectory = function(location) {
    const rootPath = `/root/${location}`;
    const rootFile = new File(rootPath);
    rootFile._exists = true;
    rootFile._isDirectory = true;
    return rootFile;
};

module.exports = File;

