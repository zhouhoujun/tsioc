import { GET, MESSAGE, POST, StatusVaildator } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';


@Injectable({ static: true })
export class CoapStatusVaildator implements StatusVaildator<string>{
    get ok(): string {
        return CoapStatuCode.Content
    }
    get found(): string {
        return '3.02'
    }

    get notFound(): string {
        return CoapStatuCode.NotFound
    }

    get none(): string {
        return '0.00';
    }
    get noContent(): string {
        return CoapStatuCode.Changed
    }

    get serverError(): string {
        return CoapStatuCode.InternalServerError
    }
    get gatewayTimeout(): string {
        return CoapStatuCode.GatewayTimeout
    }


    isStatus(status: string): boolean {
        return !!(CoapMessages as Record<string, string | undefined>)[status]
    }

    isOk(status: string): boolean {
        return isStausOk.test(status);
    }
    isNotFound(status: string): boolean {
        return status === CoapStatuCode.NotFound
    }
    isEmpty(status: string): boolean {
        return emptyStatus[status]
    }
    isEmptyExecption(status: string): boolean{
        return emptyErrorStatus[status];
    }
    isRedirect(status: string): boolean {
        return redirectStatus[status]
    }
    isRequestFailed(status: string): boolean {
        return /^4\./.test(status);
    }
    isServerError(status: string): boolean {
        return /^5\./.test(status);
    }
    isRetry(status: string): boolean {
        return retryStatus[status];
    }
    redirectBodify(status: string, method?: string | undefined): boolean {
        if (!method) return status === '3.03';
        return status === '3.03' || ((status === '3.01' || status === '3.02') && method === POST)
    }

    redirectDefaultMethod(): string {
        return GET;
    }

}

@Injectable({ static: true })
export class CoapMicroStatusVaildator extends CoapStatusVaildator {

    override redirectDefaultMethod(): string {
        return MESSAGE;
    }
}

const isStausOk = /^2\.0(1|2|3|5)$/;

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number | string, boolean> = {
    '2.02': true,
    '2.03': true,
    '2.04': true,
    '3.04': true
}

const emptyErrorStatus: Record<number | string, boolean> =  {
    '4.04': true
}

/**
 * status codes for redirects
 */
const redirectStatus: Record<number | string, boolean> = {
    '3.00': true,
    '3.01': true,
    '3.02': true,
    '3.03': true,
    '3.05': true,
    '3.07': true,
    '3.08': true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number | string, boolean> = {
    '5.02': true,
    '5.03': true,
    '5.04': true
}

/**
 *    The name of the sub-registry is "CoAP Response Codes".

 *    Each entry in the sub-registry must include the Response Code in the
 *    range 2.00-5.31, a description of the Response Code, and a reference
 *    to the Response Code's documentation.
 * 
 *    https://www.iana.org/assignments/core-parameters/core-parameters.xhtml#content-formats
 * 
 *    Initial entries in this sub-registry are as follows:
 *
 *             +------+------------------------------+-----------+
 *             | Code | Description                  | Reference |
 *             +------+------------------------------+-----------+
 *             | 2.01 | Created                      | [RFC7252] |
 *             | 2.02 | Deleted                      | [RFC7252] |
 *             | 2.03 | Valid                        | [RFC7252] |
 *             | 2.04 | Changed                      | [RFC7252] |
 *             | 2.05 | Content                      | [RFC7252] |
 *             | 2.31 |	Continue	                 | [RFC7959] |
 *             | 3.00-3.31 |	Reserved	         | [RFC7252] |
 *             | 4.00 | Bad Request                  | [RFC7252] |
 *             | 4.01 | Unauthorized                 | [RFC7252] |
 *             | 4.02 | Bad Option                   | [RFC7252] |
 *             | 4.03 | Forbidden                    | [RFC7252] |
 *             | 4.04 | Not Found                    | [RFC7252] |
 *             | 4.05 | Method Not Allowed           | [RFC7252] |
 *             | 4.06 | Not Acceptable               | [RFC7252] |
 *             | 4.12 | Precondition Failed          | [RFC7252] |
 *             | 4.13 | Request Entity Too Large     | [RFC7252] |
 *             | 4.15 | Unsupported Content-Format   | [RFC7252] |
 *             | 5.00 | Internal Server Error        | [RFC7252] |
 *             | 5.01 | Not Implemented              | [RFC7252] |
 *             | 5.02 | Bad Gateway                  | [RFC7252] |
 *             | 5.03 | Service Unavailable          | [RFC7252] |
 *             | 5.04 | Gateway Timeout              | [RFC7252] |
 *             | 5.05 | Proxying Not Supported       | [RFC7252] |
 *             +------+------------------------------+-----------+
 * 
 */
export enum CoapStatuCode {
    Created = '2.01',
    Deleted = '2.02',
    Valid = '2.03',
    Changed = '2.04',
    Content = '2.05',
    Continue = '2.31',
    BadRequest = '4.00',
    Unauthorized = '4.01',
    BadOption = '4.02',
    Forbidden = '4.03',
    NotFound = '4.04',
    MethodNotAllowed = '4.05',
    NotAcceptable = '4.06',
    RequestEntityIncomplete = '4.08',
    Conflict = '4.09',
    PreconditionFailed = '4.12',
    RequestEntityTooLarge = '4.13',
    UnsupportedContentFormat = '4.15',
    UnprocessableEntity = '4.22',
    TooManyRequests = "4.29",
    InternalServerError = '5.00',
    NotImplemented = '5.01',
    BadGateway = '5.02',
    ServiceUnavailable = '5.03',
    GatewayTimeout = '5.04',
    ProxyingNotSupported = '5.05',
    HopLimitReached = '5.08'
}

export const CoapMessages: Record<string, string> = {
    '2.01': 'Created',
    '2.02': 'Deleted',
    '2.03': 'Valid',
    '2.04': 'Changed',
    '2.05': 'Content',
    '2.31': 'Continue',
    '4.00': 'Bad Request',
    '4.01': 'Unauthorized',
    '4.02': 'Bad Option',
    '4.03': 'Forbidden',
    '4.04': 'Not Found',
    '4.05': 'Method Not Allowed',
    '4.06': 'Not Acceptable',
    '4.08': 'Request Entity Incomplete',
    '4.09': 'Conflict',
    '4.12': 'Precondition Failed',
    '4.13': 'Request Entity Too Large',
    '4.15': 'Unsupported Content-Format',
    '4.22': 'Unprocessable Entity',
    '4.29': 'Too Many Requests',
    '5.00': 'Internal Server Error',
    '5.01': 'Not Implemented',
    '5.02': 'Bad Gateway',
    '5.03': 'Service Unavailable',
    '5.04': 'Gateway Timeout',
    '5.05': 'Proxying Not Supported',
    '5.08': 'Hop Limit Reached'
}