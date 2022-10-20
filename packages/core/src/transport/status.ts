import { Abstract } from '@tsdi/ioc';
import { IncomingHeaders } from './headers';

/**
 * transport response status
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
 * not found status
 */
export class NotFoundStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'NotFound') {
        super(status, statusText);
    }
}

export class NoContentStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'NoContent') {
        super(status, statusText);
    }
}

export class ResetContentStatus<T = string | number> extends EmptyStatus<T> {
    constructor(status: T, statusText = 'ResetContent') {
        super(status, statusText);
    }
}

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
 * Found status
 */
export class FoundStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'Found') {
        super(status, statusText);
    }
}

export class SeeOtherStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'SeeOther') {
        super(status, statusText);
    }
}

export class UseProxyStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'UseProxy') {
        super(status, statusText);
    }
}

export class TemporaryRedirectStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'TemporaryRedirect') {
        super(status, statusText);
    }
}

export class PermanentRedirectStatus<T = string | number> extends RedirectStatus<T> {
    constructor(status: T, statusText = 'PermanentRedirect') {
        super(status, statusText);
    }
}


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


export class BadRequestStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'BadRequest') {
        super(status, statusText);
    }
}


export class ForbiddenStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'Forbidden') {
        super(status, statusText);
    }
}

export class UnauthorizedStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'Unauthorized') {
        super(status, statusText);
    }
}

export class MethodNotAllowedStatus<T = string | number> extends RequestFailedStatus<T> {
    constructor(status: T, statusText = 'MethodNotAllowed') {
        super(status, statusText);
    }
}

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

@Abstract()
export abstract class StatusFactory<T = string | number> {
    abstract create(type: StatusTypes, statusText?: string): Status<T>;
    abstract createByCode(status: number | string | null, statusText?: string): Status<T>;
    abstract createByHeaders(headers: IncomingHeaders): Status<T>;
}


// import { Abstract } from '@tsdi/ioc';

// /**
//  * transport status.
//  */
// @Abstract()
// export abstract class TransportStatus<T = number | string> {

//     abstract isValidCode(status: T): boolean;
//     /**
//      * parse status.
//      * @param status 
//      */
//     abstract parseCode(status?: string | number | null): T;
//     /**
//      * from status.
//      * @param status 
//      */
//     abstract fromCode(status: T): States;
//     /**
//      * to status.
//      * @param state 
//      */
//     abstract toCode(state: States): T;
//     /**
//      * is status empty body or not.
//      */
//     isEmpty(status: T): boolean {
//         const state = this.fromCode(status);
//         return state == States.NoContent
//             || state == States.ResetContent
//             || state == States.NotModified
//     }
//     /**
//      * is redirect or not.
//      * @param status 
//      * @returns 
//      */
//     isRedirect(status: T): boolean {
//         const state = this.fromCode(status);
//         return state == States.Found
//             || state == States.MovedPermanently
//             || state == States.SeeOther
//             || state == States.UseProxy
//             || state == States.TemporaryRedirect
//             || state == States.PermanentRedirect
//     }
//     /**
//      * is retry o not.
//      * @param status 
//      * @returns 
//      */
//     isRetry(status: T): boolean {
//         const state = this.fromCode(status);
//         return state == States.BadGateway
//             || state == States.ServiceUnavailable
//             || state == States.GatewayTimeout
//     }
//     /**
//      * get status statusText.
//      */
//     abstract statusText(status: T): string;

// }

// /**
//  * transport states.
//  */
// export enum States {
//     None = 0,
//     /**
//      * ok state flags.
//      */
//     Ok = 1,


//     /**
//      * no content state flags.
//      */
//     NoContent,
//     /**
//      * reset content.
//      * no content state.
//      */
//     ResetContent,
//     /**
//      * not modified.
//      */
//     NotModified,


//     /**
//      * found flags
//      * redirect state.
//      */
//     Found,
//     /**
//      * moved permanently.
//      * redirect state.
//      */
//     MovedPermanently,
//     /**
//      * see other.
//      * redirect state.
//      */
//     SeeOther,
//     /**
//      * use proxy.
//      * redirect state.
//      */
//     UseProxy,
//     /**
//      * temporary redirect.
//      * redirect state.
//      */
//     TemporaryRedirect,
//     /**
//      * Permanent Redirect.
//      * redirect state.
//      */
//     PermanentRedirect,


//     /**
//      * bad request state flags.
//      */
//     BadRequest,
//     /**
//      * Unauthorized state flags.
//      */
//     Unauthorized,
//     /**
//      * forbidden state flags.
//      */
//     Forbidden,
//     /**
//      * not found state flags.
//      */
//     NotFound,
//     /**
//      * method not allowed.
//      */
//     MethodNotAllowed,
//     /**
//      * request timeout.
//      */
//     RequestTimeout,
//     /**
//      * unsupported media type state flags.
//      */
//     UnsupportedMediaType,

//     /**
//      * Internal server error state flags.
//      */
//     InternalServerError,


//     /**
//      * Not implemeted.
//      */
//     NotImplemented,


//     /**
//      * bad gateway.
//      * retry state
//      */
//     BadGateway,
//     /**
//      * retry state
//      */
//     ServiceUnavailable,
//     /**
//      * retry state
//      */
//     GatewayTimeout

// }


// /**
//  * redirect transport state.
//  */
// export interface RedirectTransportStatus {

//     /**
//      * redirect can with body or not.
//      * @param status 
//      * @param method 
//      */
//     redirectBodify(status: string | number, method?: string): boolean;

//     /**
//      * redirect default request method.
//      */
//     redirectDefaultMethod(): string;
// }
