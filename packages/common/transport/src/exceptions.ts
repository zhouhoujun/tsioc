import { Exception, isArray } from '@tsdi/ioc';


/**
 * Message Exception
 *
 * @export
 * @extends {Exception}
 */
export class MessageException extends Exception {

    headerSent?: boolean;
    headers?: Record<string, any>;
    code?: any;
    constructor(message?: string | string[], public status?: any) {
        super(isArray(message) ? message.join('\n') : message ?? '')
    }

    get statusCode(): any {
        return this.status;
    }

    toString() {
        return `Message Exception: ${this.statusCode}, ${this.message}`
    }
}

/**
 * about execption.
 */
export class AboutException extends MessageException {
    constructor(message = 'About') {
        super(message)
    }
}

/**
 * Invalid header token execption.
 */
export class InvalidHeaderTokenException extends MessageException {
    constructor(message = 'Invalid header token.') {
        super(message);
    }
}

/**
 * Invalid state execption.
 */
export class InvalidStateException extends MessageException {
    constructor(message = 'INVALID_STATE_ERR') {
        super(message)
    }
}

/**
 * security execption.
 */
export class SecurityException extends MessageException {
    constructor(message = 'SecurityException') {
        super(message)
    }
}



/**
 * Bad request execption.
 *
 * @export
 * @class BadRequestException
 * @extends {MessageException}
 */
export class BadRequestException extends MessageException {
    constructor(message = 'Bad Request', status?: string | number) {
        super(message, status)
    }
}

/**
 * Unauthorized execption.
 *
 * @export
 * @class UnauthorizedException
 * @extends {MessageException}
 */
export class UnauthorizedException extends MessageException {
    constructor(message = 'Unauthorized', status?: string | number) {
        super(message, status)
    }
}

/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenException
 * @extends {MessageException}
 */
export class ForbiddenException extends MessageException {
    constructor(message = 'Forbidden', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not found execption.
 *
 * @export
 * @class NotFoundException
 * @extends {MessageException}
 */
export class NotFoundException extends MessageException {
    constructor(message = 'Not Found', status?: string | number) {
        super(message, status)
    }
}


/**
 * Method Not Allowed execption.
 *
 * @export
 * @class MethodNotAllowedException
 * @extends {MessageException}
 */
export class MethodNotAllowedException extends MessageException {
    constructor(message = 'Method Not Allowed', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not Acceptable execption.
 *
 * @export
 * @class NotAcceptableException
 * @extends {MessageException}
 */
export class NotAcceptableException extends MessageException {
    constructor(message = 'Not Acceptable', status?: string | number) {
        super(message, status)
    }
}

/**
 * unsupported media type execption.
 */
export class UnsupportedMediaTypeException extends MessageException {
    constructor(message = 'Unsupported Media Type', status?: string | number) {
        super(message, status)
    }
}

/**
 * Request Timeout execption.
 *
 * @export
 * @class TimeoutException
 * @extends {MessageException}
 */
export class RequestTimeoutException extends MessageException {
    constructor(message = 'Request Timeout', status?: string | number) {
        super(message, status)
    }
}


/**
 * internal server execption.
 *
 * server side exception.
 */
export class InternalServerException extends MessageException {
    constructor(message = 'Internal Server Error', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not implemented execption.
 * 
 * server side exception.
 */
export class NotImplementedException extends MessageException {
    constructor(message = 'Not Implemented', status?: string | number) {
        super(message, status)
    }
}

/**
 * Bad Gateway execption.
 * 
 * server side exception.
 */
export class BadGatewayException extends MessageException {
    constructor(message = 'Bad Gateway', status?: string | number) {
        super(message, status)
    }
}

/**
 * Service Unavailable execption.
 * 
 * server side exception.
 */
export class ServiceUnavailableException extends MessageException {
    constructor(message = 'Service Unavailable', status?: string | number) {
        super(message, status)
    }
}

/**
 * Gateway Timeout execption.
 * 
 * server side exception.
 */
export class GatewayTimeoutException extends MessageException {
    constructor(message = 'Gateway Timeout', status?: string | number) {
        super(message, status)
    }
}

/**
 * connection refused error.
 * socket error code
 */
export const ECONNREFUSED = 'ECONNREFUSED';
/**
 * Address already in use error.
 * socket error code
 */
export const EADDRINUSE = 'EADDRINUSE';
/**
 * connection read timeout.
 * socket error code
 */
export const ECONNRESET = 'ECONNRESET';
/**
 * Address not found in dns.
 * socket error code
 */
export const ENOTFOUND = 'ENOTFOUND';

/**
 * not directory.
 */
export const ENOTDIR = 'ENOTDIR';
/**
 * No such file or directory.
 */
export const ENOENT = 'ENOENT';
/**
 * name too long.
 */
export const ENAMETOOLONG = 'ENAMETOOLONG';


export class InvalidStreamException extends Exception {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}

export class HeandersSentException extends Exception {
    constructor(message = 'Headers has sent') {
        super(`HeandersSentException: ${message}`)
    }
}

export class InvalidSessionException extends Exception {
    constructor(message = 'Invalid session error') {
        super(`InvalidSessionException: ${message}`)
    }
}


/**
 * Not Supported execption.
 * 
 * server side exception.
 */
export class NotSupportedException extends MessageException {
    constructor(message = 'Not Supported', status?: string | number) {
        super(message, status)
    }
}


export class PushDisabledException extends Exception {
    constructor(message = 'Push disabled') {
        super(`PushDisabledException: ${message}`)
    }
}


export class NestedPushException extends Exception {
    constructor(message = 'Nest push') {
        super(`NestedPushException: ${message}`)
    }
}


export class PacketLengthException extends Exception {

}

