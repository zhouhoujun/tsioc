import { getClassName } from '@tsdi/ioc';
import { MessageExecption, OutgoingMessage } from '@tsdi/common/transport';


/**
 * Authentication Execption.
 *
 * @export
 * @extends {MessageExecption}
 */
export class AuthenticationExecption extends MessageExecption {
    error: string;
    expose: boolean;
    // tslint:disable-next-line: variable-name
    constructor(status: number, message: string | string[], public error_description?: string | string[]) {
        super(message, status);
        this.name = getClassName(this);
        this.error = this.message;
        this.expose = status < 500;
    }
}


/**
 * internal oauth error.
 *
 * @export
 * @extends {AuthenticationExecption}
 */
export class InternalOAuthExecption extends AuthenticationExecption {
    constructor(message: string, public oauthError: Error) {
        super(400, message)
    }
}


/**
 * invaild request error.
 *
 * @export
 * @class InvalidRequestExecption
 * @extends {AuthenticationExecption}
 */
export class InvalidRequestExecption extends AuthenticationExecption {
    constructor(description?: string, status = 400) {
        super(status, '', description || 'request is invalid')
    }
}


/**
 * invalid token.
 *
 * @export
 * @class InvalidTokenExecption
 * @extends {AuthenticationError}
 */
export class InvalidTokenExecption extends AuthenticationExecption {
    // tslint:disable-next-line:variable-name
    public error_detail: string;
    constructor(detail: string) {
        super(401, 'invalid_token', 'invalid token provided')
        this.error_detail = detail;
    }
}



export class NoOpenIDExecption extends AuthenticationExecption {
    constructor(message: string, public response: OutgoingMessage) {
        super(400, message);
    }
}


/**
 * OIDC execption.
 *
 * @export
 * @class OIDCExecption
 * @extends {AuthenticationExecption}
 */
export class OIDCExecption extends AuthenticationExecption {

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