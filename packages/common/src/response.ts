import { OutgoingHeaders } from './headers';
import { HeaderPacket, StatusCode } from './packet';

/**
 * event response.
 */
export interface TransportResponseEvent {
    type: number;
}

export interface TransportHeaderResponse extends HeaderPacket {
    type?: number | string;
    headers: OutgoingHeaders;
    status?: StatusCode;
    statusText?: string;
}

export interface TransportResponse<T = any> extends TransportHeaderResponse {
    payload: T;
}


export interface TransportErrorResponse extends HeaderPacket {
    error: any;
    status?: StatusCode;
    statusText?: string;
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 */
export interface ResponseJsonParseError {
    error: Error;
    text: string;
}

/**
 * transport event.
 * response for `TransportClient`.
 */
export type TransportEvent<T = any> = TransportResponseEvent | TransportHeaderResponse | TransportResponse<T>;



// import { isNil } from '@tsdi/ioc';
// import { ResHeaders, ResHeadersLike } from './headers';


// /**
//  * Transport error response.
//  * response for `TransportClient`.
//  */
// export class TransportErrorResponse<TStatus = any> {
//     readonly error: any;
//     readonly url: string;
//     readonly status: TStatus;
//     get statusText(): string {
//         return this.statusMessage;
//     }
//     readonly statusMessage: string;
//     readonly headers: ResHeaders;

//     constructor(options: {
//         url?: string,
//         headers?: ResHeadersLike;
//         status?: TStatus;
//         error?: any;
//         statusText?: string;
//         statusMessage?: string;
//     }) {
//         this.url = options.url ?? '';
//         this.status = options.status ?? 0 as TStatus;
//         this.statusMessage = options.statusMessage ?? options.statusText ?? '';
//         this.error = options.error;
//         this.headers = new ResHeaders(options.headers);
//     }
// }

// /**
//  * client receive Response.
//  * response for `TransportClient`.
//  */
// export class TransportHeaderResponse<TStatus = any> {
//     readonly url: string;
//     readonly ok: boolean;
//     readonly status: TStatus;
//     get statusText(): string {
//         return this.statusMessage;
//     }

//     readonly statusMessage: string;
//     readonly headers: ResHeaders;

//     constructor(options: {
//         url?: string,
//         ok?: boolean;
//         headers?: ResHeadersLike;
//         status?: TStatus;
//         statusText?: string;
//         statusMessage?: string;
//     }) {
//         this.url = options.url ?? '';
//         this.status = options.status ?? (options.headers ? 200 : 0) as TStatus
//         this.ok = options.ok ?? true;
//         this.statusMessage = options.statusMessage ?? options.statusText ?? '';
//         this.headers = new ResHeaders(options.headers);
//     }

// }


// /**
//  * client receive Response.
//  * response for `TransportClient`.
//  */
// export class TransportResponse<T = any, TStatus = any> {
//     readonly url: string;
//     readonly ok: boolean;
//     readonly status: TStatus;
//     get statusText(): string {
//         return this.statusMessage;
//     }

//     readonly statusMessage: string;
//     readonly headers: ResHeaders;

//     readonly body: T | null;

//     constructor(options: {
//         url?: string,
//         ok?: boolean;
//         headers?: ResHeadersLike;
//         status?: TStatus
//         statusText?: string;
//         statusMessage?: string;
//         body?: T;
//         payload?: T;
//     }) {
//         this.url = options.url ?? '';
//         const noRes = isNil(options.payload || options.body || options.headers);
//         this.status = options.status ?? (noRes ? 0 : 200) as TStatus;
//         this.ok = options.ok ?? !noRes;
//         this.body = options.body ?? options.payload ?? null;
//         this.statusMessage = options.statusMessage ?? options.statusText ?? '';
//         this.headers = new ResHeaders(options.headers);
//     }
// }

// /**
//  * event response.
//  */
// export interface ResponseEvent {
//     type: number;
// }

// /**
//  * transport event.
//  * response for `TransportClient`.
//  */
// export type TransportEvent<T = any, TStatus = any> = TransportHeaderResponse<TStatus> | TransportResponse<T, TStatus> | ResponseEvent;

// /**
//  * An error that represents a failed attempt to JSON.parse text coming back
//  * from the server.
//  *
//  * It bundles the Error object with the actual response body that failed to parse.
//  *
//  */
// export interface ResponseJsonParseError {
//     error: Error;
//     text: string;
// }
