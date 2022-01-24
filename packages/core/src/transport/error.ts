export type TransportStatus = 'Bad Request' | 'Forbidden' | 'Internal Server Error' | 'Not Acceptable' | 'Not Found' | 'Unauthorized' | 'Method Not Allowed' | number;

/**
 * transport error.
 */
export class TransportError extends Error {
    constructor(readonly status: TransportStatus, message: string) {
        super(message);
        Object.setPrototypeOf(this, TransportError.prototype);
        Error.captureStackTrace(this);
    }
}


/**
 * invalid message error.
 */
export class InvalidMessageError extends TransportError {
    constructor(message?: string) {
        super('Bad Request', message || 'Invalid message');
        Object.setPrototypeOf(this, InvalidMessageError.prototype);
        Error.captureStackTrace(this);
    }
}
