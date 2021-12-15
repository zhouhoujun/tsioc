
/**
 * invalid message error.
 */
export class InvalidMessageError extends Error  {
    constructor(message?: string) {
        super(message || 'Invalid message');
        Object.setPrototypeOf(this, InvalidMessageError.prototype);
        Error.captureStackTrace(this);
    }
}

