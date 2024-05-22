import { Execption, isArray } from '@tsdi/ioc';


/**
 * Message Execption
 *
 * @export
 * @extends {Execption}
 */
export class MessageExecption extends Execption {

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
        return `Message Execption: ${this.statusCode}, ${this.message}`
    }
}

/**
 * about execption.
 */
export class AboutExecption extends MessageExecption {
    constructor(message = 'About') {
        super(message)
    }
}

/**
 * Invalid header token execption.
 */
export class InvalidHeaderTokenExecption extends MessageExecption {
    constructor(message = 'Invalid header token.') {
        super(message);
    }
}

/**
 * Invalid state execption.
 */
export class InvalidStateExecption extends MessageExecption {
    constructor(message = 'INVALID_STATE_ERR') {
        super(message)
    }
}

/**
 * security execption.
 */
export class SecurityExecption extends MessageExecption {
    constructor(message = 'SecurityExecption') {
        super(message)
    }
}



/**
 * Bad request execption.
 *
 * @export
 * @class BadRequestExecption
 * @extends {MessageExecption}
 */
export class BadRequestExecption extends MessageExecption {
    constructor(message = 'Bad Request', status?: string | number) {
        super(message, status)
    }
}

/**
 * Unauthorized execption.
 *
 * @export
 * @class UnauthorizedExecption
 * @extends {MessageExecption}
 */
export class UnauthorizedExecption extends MessageExecption {
    constructor(message = 'Unauthorized', status?: string | number) {
        super(message, status)
    }
}

/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenExecption
 * @extends {MessageExecption}
 */
export class ForbiddenExecption extends MessageExecption {
    constructor(message = 'Forbidden', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not found execption.
 *
 * @export
 * @class NotFoundExecption
 * @extends {MessageExecption}
 */
export class NotFoundExecption extends MessageExecption {
    constructor(message = 'Not Found', status?: string | number) {
        super(message, status)
    }
}


/**
 * Method Not Allowed execption.
 *
 * @export
 * @class MethodNotAllowedExecption
 * @extends {MessageExecption}
 */
export class MethodNotAllowedExecption extends MessageExecption {
    constructor(message = 'Method Not Allowed', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not Acceptable execption.
 *
 * @export
 * @class NotAcceptableExecption
 * @extends {MessageExecption}
 */
export class NotAcceptableExecption extends MessageExecption {
    constructor(message = 'Not Acceptable', status?: string | number) {
        super(message, status)
    }
}

/**
 * unsupported media type execption.
 */
export class UnsupportedMediaTypeExecption extends MessageExecption {
    constructor(message = 'Unsupported Media Type', status?: string | number) {
        super(message, status)
    }
}

/**
 * Request Timeout execption.
 *
 * @export
 * @class TimeoutExecption
 * @extends {MessageExecption}
 */
export class RequestTimeoutExecption extends MessageExecption {
    constructor(message = 'Request Timeout', status?: string | number) {
        super(message, status)
    }
}


/**
 * internal server execption.
 *
 * server side exception.
 */
export class InternalServerExecption extends MessageExecption {
    constructor(message = 'Internal Server Error', status?: string | number) {
        super(message, status)
    }
}

/**
 * Not implemented execption.
 * 
 * server side exception.
 */
export class NotImplementedExecption extends MessageExecption {
    constructor(message = 'Not Implemented', status?: string | number) {
        super(message, status)
    }
}

/**
 * Bad Gateway execption.
 * 
 * server side exception.
 */
export class BadGatewayExecption extends MessageExecption {
    constructor(message = 'Bad Gateway', status?: string | number) {
        super(message, status)
    }
}

/**
 * Service Unavailable execption.
 * 
 * server side exception.
 */
export class ServiceUnavailableExecption extends MessageExecption {
    constructor(message = 'Service Unavailable', status?: string | number) {
        super(message, status)
    }
}

/**
 * Gateway Timeout execption.
 * 
 * server side exception.
 */
export class GatewayTimeoutExecption extends MessageExecption {
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


export class InvalidStreamExecption extends Execption {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}

export class HeandersSentExecption extends Execption {
    constructor(message = 'Headers has sent') {
        super(`HeandersSentExecption: ${message}`)
    }
}

export class InvalidSessionExecption extends Execption {
    constructor(message = 'Invalid session error') {
        super(`InvalidSessionExecption: ${message}`)
    }
}


/**
 * Not Supported execption.
 * 
 * server side exception.
 */
export class NotSupportedExecption extends MessageExecption {
    constructor(message = 'Not Supported', status?: string | number) {
        super(message, status)
    }
}


export class PushDisabledExecption extends Execption {
    constructor(message = 'Push disabled') {
        super(`PushDisabledExecption: ${message}`)
    }
}


export class NestedPushExecption extends Execption {
    constructor(message = 'Nest push') {
        super(`NestedPushExecption: ${message}`)
    }
}


export class PacketLengthException extends Execption {

}

