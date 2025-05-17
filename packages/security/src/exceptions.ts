import { getTypeName } from '@tsdi/ioc';
import { MessageException, OutgoingMessage } from '@tsdi/common/transport';


/**
 * Authentication Exception.
 *
 * @export
 * @extends {MessageException}
 */
export class AuthenticationException extends MessageException {
    error: string;
    expose: boolean;
    // tslint:disable-next-line: variable-name
    constructor(status: number, message: string | string[], public error_description?: string | string[]) {
        super(message, status);
        this.name = getTypeName(this);
        this.error = this.message;
        this.expose = status < 500;
    }
}


/**
 * internal oauth error.
 *
 * @export
 * @extends {AuthenticationException}
 */
export class InternalOAuthException extends AuthenticationException {
    constructor(message: string, public oauthError: Error) {
        super(400, message)
    }
}


/**
 * invaild request error.
 *
 * @export
 * @class InvalidRequestException
 * @extends {AuthenticationException}
 */
export class InvalidRequestException extends AuthenticationException {
    constructor(description?: string, status = 400) {
        super(status, '', description || 'request is invalid')
    }
}


/**
 * invalid token.
 *
 * @export
 * @class InvalidTokenException
 * @extends {AuthenticationError}
 */
export class InvalidTokenException extends AuthenticationException {
    // tslint:disable-next-line:variable-name
    public error_detail: string;
    constructor(detail: string) {
        super(401, 'invalid_token', 'invalid token provided')
        this.error_detail = detail;
    }
}



export class NoOpenIDException extends AuthenticationException {
    constructor(message: string, public response: OutgoingMessage) {
        super(400, message);
    }
}


/**
 * OIDC execption.
 *
 * @export
 * @class OIDCException
 * @extends {AuthenticationException}
 */
export class OIDCException extends AuthenticationException {

    constructor(message: string | string[], public code: string | string[], public uri?: string | string[], status?: number) {
        super(status ?? toStatusCode(code), message);
    }
}

function toStatusCode(code: string | string[]) {
    let status = 401;
    switch (code) {
        case 'access_denied': status = 403; break;
        case 'server_error': status = 502; break;
        case 'temporarily_unavailable': status = 503; break;
    }
    return status
}