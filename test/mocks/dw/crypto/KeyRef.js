/**
 * Mock implementation of dw/crypto/KeyRef
 * Stores the alias passed to the constructor so tests can assert on it.
 */

function KeyRef(alias) {
    this.alias = alias;
}

module.exports = KeyRef;
