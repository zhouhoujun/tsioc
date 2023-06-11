import { GET, MESSAGE } from '@tsdi/core';
import { Inject, Injectable, tokenId } from '@tsdi/ioc';
import { StatusVaildator } from '@tsdi/transport';


@Injectable({ static: true })
export class CoapStatusVaildator implements StatusVaildator<string>{


    get ok(): string {
        return '2.00'
    }
    get found(): string {
        return '3.02'
    }

    get notFound(): string {
        return '4.04'
    }

    get none(): string {
        return '0.00';
    }
    get noContent(): string {
        return '0.00'
    }

    get serverError(): string {
        throw new Error('Method not implemented.');
    }

    isStatus(status: string): boolean {
        return !!(CoapMessages as Record<string, string | undefined>)[status]
    }

    isOk(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isNotFound(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isEmpty(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRedirect(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRequestFailed(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isServerError(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRetry(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    redirectBodify(status: string, method?: string | undefined): boolean {
        throw new Error('Method not implemented.');
    }

    redirectDefaultMethod(): string {
        return GET;
    }

}

//    The name of the sub-registry is "CoAP Response Codes".

//    Each entry in the sub-registry must include the Response Code in the
//    range 2.00-5.31, a description of the Response Code, and a reference
//    to the Response Code's documentation.

//    Initial entries in this sub-registry are as follows:

//             +------+------------------------------+-----------+
//             | Code | Description                  | Reference |
//             +------+------------------------------+-----------+
//             | 2.01 | Created                      | [RFC7252] |
//             | 2.02 | Deleted                      | [RFC7252] |
//             | 2.03 | Valid                        | [RFC7252] |
//             | 2.04 | Changed                      | [RFC7252] |
//             | 2.05 | Content                      | [RFC7252] |
//             | 4.00 | Bad Request                  | [RFC7252] |
//             | 4.01 | Unauthorized                 | [RFC7252] |
//             | 4.02 | Bad Option                   | [RFC7252] |
//             | 4.03 | Forbidden                    | [RFC7252] |
//             | 4.04 | Not Found                    | [RFC7252] |
//             | 4.05 | Method Not Allowed           | [RFC7252] |
//             | 4.06 | Not Acceptable               | [RFC7252] |
//             | 4.12 | Precondition Failed          | [RFC7252] |
//             | 4.13 | Request Entity Too Large     | [RFC7252] |
//             | 4.15 | Unsupported Content-Format   | [RFC7252] |
//             | 5.00 | Internal Server Error        | [RFC7252] |
//             | 5.01 | Not Implemented              | [RFC7252] |
//             | 5.02 | Bad Gateway                  | [RFC7252] |
//             | 5.03 | Service Unavailable          | [RFC7252] |
//             | 5.04 | Gateway Timeout              | [RFC7252] |
//             | 5.05 | Proxying Not Supported       | [RFC7252] |
//             +------+------------------------------+-----------+

export enum CoapStatuCode {
    Created = '2.01',
    Deleted = '2.02',
    Valid = '2.03',
    Changed ='2.04',
    Content = '2.05',
    BadRequest = '4.00',
    Unauthorized = '4.01',
    BadOption = '4.02',
    Forbidden = '4.03',
    NotFound = '4.04',
    MethodNotAllowed = '4.05',
    NotAcceptable = '4.06',
    PreconditionFailed = '4.12',
    RequestEntityTooLarge = '4.13',
    UnsupportedContentFormat = '4.15',
    InternalServerError = '5.00',
    NotImplemented = '5.01',
    BadGateway = '5.02',
    ServiceUnavailable = '5.03',
    GatewayTimeout = '5.04',
    ProxyingNotSupported = '5.05'

}

export const CoapMessages = {
    '2.01': 'Created',
    '2.02': 'Deleted',
    '2.03': 'Valid',
    '2.04': 'Changed',
    '2.05': 'Content',
    '4.00': 'Bad Request',
    '4.01': 'Unauthorized',
    '4.02': 'Bad Option',
    '4.03': 'Forbidden',
    '4.04': 'Not Found',
    '4.05': 'Method Not Allowed',
    '4.06': 'Not Acceptable',
    '4.12': 'Precondition Failed',
    '4.13': 'Request Entity Too Large',
    '4.15': 'Unsupported Content-Format',
    '5.00': 'Internal Server Error',
    '5.01': 'Not Implemented',
    '5.02': 'Bad Gateway',
    '5.03': 'Service Unavailable',
    '5.04': 'Gateway Timeout',
    '5.05': 'Proxying Not Supported'
}