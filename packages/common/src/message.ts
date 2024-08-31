import { Header, HeadersLike } from './headers';


/**
 * Incoming message
 */
export interface Incoming<T> {

    id?: number | string;

    url?: string;
    pattern?: string;
    method?: string;

    headers: HeadersLike;

    params?: Record<string, any>;

    query?: Record<string, any>

    payload?: any;

    body?: T | null

    rawBody?: any;

    path?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;

}

/**
 * Outgoing message.
 */
export interface Outgoing<T, TStatus = any> {

    id?: string | number;
    type?: string | number | null;

    pattern?: string;

    body?: T | null;

    error?: any;

    headers: HeadersLike;

    /**
     * Get packet status code.
     *
     * @return {TStatus}
     * @api public
     */
    get statusCode(): TStatus;
    /**
     * Set packet status code.
     *
     * @api public
     */
    set statusCode(code: TStatus);

    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    get statusMessage(): string;
    /**
     * Set packet status message
     *
     * @return {TPacket}
     * @api public
     */
    set statusMessage(statusText: string);

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | number | string[] | undefined;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: Header): void;

    /**
     * remove header in packet.
     * @param packet 
     * @param field 
     */
    removeHeader(field: string): void;


    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    sent?: boolean;

    /**
     * is writable or not.
     * @param packet 
     */
    writable?: boolean;

}



/**
 * client incoming message.
 */
export interface ClientIncoming<T, TStatus = any> extends Outgoing<T, TStatus> {

}

/**
 * Client Outgoing message
 */
export interface ClinetOutgoing<T> extends Incoming<T> {

}

// import { Abstract } from '@tsdi/ioc';
// import { IReadableStream } from '../transport';
// import { Header } from './headers';
// import { Pattern } from './pattern';


// export interface MessageInitOpts {
//     id?: string | number;
//     headers?: Record<string, any>;
//     data?: Buffer | IReadableStream | null;
// }

// /**
//  * Message.
//  */
// export abstract class Message {

//     id: string | number | undefined;

//     streamLength?: number;

//     noHead?: boolean;

//     abstract get headers(): Record<string, Header>;

//     abstract get data(): string | Buffer | IReadableStream | null;

//     abstract set data(value: string | Buffer | IReadableStream | null);
// }


// /**
//  * base message.
//  */
// export class BaseMessage extends Message {
//     public id: string | number | undefined;

//     readonly headers: Record<string, Header>;

//     public data: string | Buffer | IReadableStream | null;

//     public streamLength?: number;

//     public noHead?: boolean;

//     constructor(init: {
//         id?: string | number;
//         headers?: Record<string, any>;
//         data?: string | Buffer | IReadableStream | null;
//         streamLength?: number;
//     }) {
//         super();
//         this.id = init.id;
//         this.data = init.data ?? null;
//         this.streamLength = init.streamLength;
//         this.headers = init.headers ?? {};
//     }
// }

// export class UrlMesage extends BaseMessage {

//     constructor(readonly url: string, init: {
//         id?: string | number;
//         headers?: Record<string, any>;
//         data?: string | Buffer | IReadableStream | null;
//         streamLength?: number;
//     }) {
//         super(init)
//     }
// }

// export class TopicMesage extends BaseMessage {

//     constructor(readonly topic: string, readonly responseTopic: string | undefined, init: {
//         id?: string | number;
//         headers?: Record<string, any>;
//         data?: string | Buffer | IReadableStream | null;
//         streamLength?: number;
//     }) {
//         super(init)
//     }
// }


// export class PatternMesage extends BaseMessage {
//     constructor(readonly pattern: string, init: {
//         id?: string | number;
//         pattern?: Pattern;
//         headers?: Record<string, any>;
//         data?: string | Buffer | IReadableStream | null;
//         streamLength?: number;
//     }) {
//         super(init)
//     }
// }

// /**
//  * Message factory
//  */
// @Abstract()
// export abstract class MessageFactory {
//     abstract create(initOpts: {
//         [x: string]: any;
//         id?: string | number;
//         headers?: Record<string, any>;
//         data?: any;
//         streamLength?: number;
//     }): Message;
// }
