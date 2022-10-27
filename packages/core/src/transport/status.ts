import { Abstract } from '@tsdi/ioc';
import { Incoming } from './packet';

/**
 * transport status
 */
export class Status<T = string | number> {
    readonly status: T;
    readonly statusText?: string
    constructor(status: T, statusText?: string) {
        this.status = status;
        this.statusText = statusText;
    }
}

/**
 * not found status
 */
export class OkStatus<T = string | number> extends Status<T> {
    constructor(status: T, statusText = 'Ok') {
        super(status, statusText);
    }
}



/**
 * empty status base class.
 */
export class EmptyStatus<T = string | number> extends Status<T> {
    constructor(status: T, statusText?: string) {
        super(status, statusText);
    }
}


/**
 * not found status.
 * empty status
 */
export class NotFoundStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'NotFound') {
        super(status, statusText);
    }
}
/**
 * no content status.
 * empty status
 */
export class NoContentStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'NoContent') {
        super(status, statusText);
    }
}
/**
 * reset content status.
 * empty status
 */
export class ResetContentStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'ResetContent') {
        super(status, statusText);
    }
}
/**
 * not modified status.
 * empty status
 */
export class NotModifiedStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'NotModified') {
        super(status, statusText);
    }
}




/**
 * redircet status base.
 */
export class RedirectStatus<T = string | number> extends Status<T> {
    readonly redirect = true;
    constructor(status: T, statusText?: string) {
        super(status, statusText);
    }
}

/**
 * Found status.
 * redircet status.
 */
export class FoundStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'Found') {
        super(status, statusText);
    }
}

/**
 * See other status.
 * redircet status.
 */
export class SeeOtherStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'SeeOther') {
        super(status, statusText);
    }
}
/**
 * Use proxy status.
 * redircet status.
 */
export class UseProxyStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'UseProxy') {
        super(status, statusText);
    }
}
/**
 * redircet status.
 */
export class TemporaryRedirectStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'TemporaryRedirect') {
        super(status, statusText);
    }
}
/**
 * redircet status.
 */
export class PermanentRedirectStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'PermanentRedirect') {
        super(status, statusText);
    }
}
/**
 * redircet status.
 */
export class MovedPermanentlyStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'MovedPermanently') {
        super(status, statusText);
    }
}


/**
 * request failed base class.
 */
export class RequestFailedStatus<T = string | number> extends Status<T> {
    readonly redirect = true;
    constructor(status: T, statusText?: string) {
        super(status, statusText);
    }
}

/**
 * Bad Request.
 * request failed.
 */
export class BadRequestStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'BadRequest') {
        super(status, statusText);
    }
}

/**
 * Forbidden status.
 * request failed.
 */
export class ForbiddenStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'Forbidden') {
        super(status, statusText);
    }
}
/**
 * Unauthorized status.
 * request failed.
 */
export class UnauthorizedStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'Unauthorized') {
        super(status, statusText);
    }
}
/**
 * Method not allowed status.
 * request failed.
 */
export class MethodNotAllowedStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'MethodNotAllowed') {
        super(status, statusText);
    }
}
/**
 * request timeout status.
 * request failed.
 */
export class RequestTimeoutStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'RequestTimeout') {
        super(status, statusText);
    }
}


/**
 * unsupported media type.
 */
export class UnsupportedMediaTypeStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'UnsupportedMediaType') {
        super(status, statusText);
    }
}




/**
 * server failed base class.
 */
export class ServerFailedStatus<T = string | number> extends Status<T> {
    readonly redirect = true;
    constructor(status: T, statusText?: string) {
        super(status, statusText);
    }
}


export class InternalServerErrorStatus<T = string | number> extends ServerFailedStatus<T> {
    constructor(status: T, statusText = 'InternalServerError') {
        super(status, statusText);
    }
}

export class NotImplementedStatus<T = string | number> extends ServerFailedStatus<T> {
    constructor(status: T, statusText = 'NotImplemented') {
        super(status, statusText);
    }
}



/**
 * retry status class.
 */
export class RetryStatus<T = string | number> extends Status<T> {
    readonly redirect = true;
    constructor(status: T, statusText?: string) {
        super(status, statusText);
    }
}

export class BadGatewayStatus<T = string | number> extends RetryStatus<T> {
    readonly redirect = true;
    constructor(status: T, statusText = 'BadGateway') {
        super(status, statusText);
    }
}

export class ServiceUnavailableStatus<T = string | number> extends RetryStatus<T> {
    readonly redirect = true;
    constructor(status: T, statusText = 'ServiceUnavailable') {
        super(status, statusText);
    }
}

export class GatewayTimeoutStatus<T = string | number> extends RetryStatus<T> {
    readonly redirect = true;
    constructor(status: T, statusText = 'GatewayTimeout') {
        super(status, statusText);
    }
}



export type StatusTypes = 'Ok'
    | 'Accepted' | 'NoContent'
    | 'Found' | 'SeeOther' | 'MovedPermanently' | 'NotModified' | 'UseProxy' | 'Unused'
    | 'BadRequest' | 'Forbidden' | 'MethodNotAllowed' | 'Unauthorized' | 'NotFound' | 'UnsupportedMediaType'
    | 'InternalServerError'
    | 'BadGateway' | 'ServiceUnavailable' | 'GatewayTimeout';



/**
 * status factory.
 */
@Abstract()
export abstract class StatusFactory<T = string | number> {
    /**
     * create status by type.
     * @param type 
     * @param statusText 
     */
    abstract create(type: StatusTypes, statusText?: string): Status<T>;
    /**
     * create status by status code.
     * @param status 
     * @param statusText 
     */
    abstract createByCode(status: number | string | null, statusText?: string): Status<T>;
    /**
     * get status code by type.
     */
    abstract getStatusCode(type: StatusTypes): T;
    /**
     * create by incoming.
     * @param headers 
     */
    abstract createByIncoming(headers: Incoming): Status<T>;
}
