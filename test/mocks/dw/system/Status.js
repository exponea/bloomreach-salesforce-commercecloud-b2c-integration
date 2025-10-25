/**
 * Mock implementation of dw/system/Status
 * Represents the status of job steps and operations
 */

class Status {
    constructor(code, status, message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }

    getCode() {
        return this.code;
    }

    getStatus() {
        return this.status;
    }

    getMessage() {
        return this.message;
    }

    isError() {
        return this.code === Status.ERROR;
    }

    isOK() {
        return this.code === Status.OK;
    }

    toString() {
        return `Status[code=${this.code}, status=${this.status}, message=${this.message}]`;
    }
}

// Status constants
Status.OK = 0;
Status.ERROR = 1;

module.exports = Status;

