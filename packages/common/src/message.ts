// import { Header, HeadersLike } from './headers';
// import { PacketOpts } from './packet';
// import { ParameterCodec } from './params';
// import { AbstractRequest } from './request';
// import { StatusOptions } from './response';


// export abstract class AbstractIncomingFactory<TIcoming = any> {
//     abstract create(options: any): TIcoming;
// }

// export interface IncomingInitOpts<T = any> {
//     /**
//      * packet id.
//      */
//     id?: string | number,
//     /**
//      * pattern.
//      */
//     pattern?: string;
//     /**
//      * headers of request.
//      */
//     headers?: HeadersLike;
//     /**
//      * request query params.
//      */
//     params?: Record<string, any>;
//     /**
//      * request query params.
//      */
//     query?: Record<string, any>;

//     /**
//      * parameter codec.
//      */
//     encoder?: ParameterCodec;
//     /**
//      * request payload, request body.
//      */
//     payload?: T;
//     /**
//      * request timeout
//      */
//     timeout?: number;

//     streamLength?: number;
// }

// export interface UrlIncomingOptions<T = any> extends IncomingInitOpts<T> {
//     /**
//      * request url.
//      */
//     url: string;
//     /**
//      * request method.
//      */
//     method?: string;
//     /**
//      * for restful
//      */
//     withCredentials?: boolean;

//     defaultMethod?: string;
// }

// export interface TopicIncomingOptions<T = any> extends IncomingInitOpts<T> {
//     /**
//      * request url.
//      */
//     topic: string;
//     /**
//      * response topic.
//      */
//     responseTopic?: string;
// }

// export interface StreamIncomingOptions<T = any> extends IncomingInitOpts<T> {
//     req: any;
//     res: any;
// }

// /**
//  * incoming options
//  */
// export type IncomingOpts<T = any> = UrlIncomingOptions<T> | TopicIncomingOptions<T> | StreamIncomingOptions<T>;


// /**
//  * Incoming factory.
//  */
// export abstract class IncomingFactory implements AbstractIncomingFactory<Incoming<any>> {
//     abstract create(options: IncomingOpts): Incoming<any>;
// }

// /**
//  * client incoming init options
//  */
// export interface UrlClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
//     url: string;
//     pattern?: string;
//     method?: string;
//     streamLength?: number;
// }

// /**
//  * client incoming init options
//  */
// export interface TopicClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
//     topic: string;
//     pattern?: string;
//     streamLength?: number;
// }

// /**
//  * client incoming init options
//  */
// export type ClientIncomingOpts<T = any, TStatus = any> = UrlClientIncomingOpts<T, TStatus> | TopicClientIncomingOpts<T, TStatus>;


// /**
//  * Incoming factory.
//  */
// export abstract class ClientIncomingFactory implements AbstractIncomingFactory<ClientIncoming<any>> {
//     abstract create(options: ClientIncomingOpts): ClientIncoming<any>;
// }


// /**
//  * Outgoing packet options.
//  */
// export interface OutgoingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
//     pattern?: string;
// }

// export abstract class AbstractOutgoingFactory<TInput = any, TOutput = any, TOpts = any> {
//     abstract create(input: TInput, options?: TOpts): TOutput;
// }

// /**
//  * Outgoing factory.
//  */
// export abstract class OutgoingFactory implements AbstractOutgoingFactory<Incoming<any>, Outgoing<any>, OutgoingOpts> {
//     abstract create(incoming: Incoming<any>, options?: OutgoingOpts): Outgoing<any>;
// }


// /**
//  * Outgoing packet options.
//  */
// export interface ClietOutgoingOpts<T = any> extends PacketOpts<T> {
//     pattern?: string;
// }

// export abstract class ClientOutgoingFactory implements AbstractOutgoingFactory<AbstractRequest<any>, ClinetOutgoing<any>, ClietOutgoingOpts> {
//     abstract create(request: AbstractRequest<any>, options?: ClietOutgoingOpts): ClinetOutgoing<any>;

// }

// /**
//  * Incoming message
//  */
// export interface Incoming<T> {

//     id?: number | string;

//     url?: string;
//     pattern?: string;
//     method?: string;

//     headers: HeadersLike;

//     params?: Record<string, any>;

//     query?: Record<string, any>;

//     payload?: any;

//     body?: T | null

//     rawBody?: any;

//     path?: any;

//     /**
//      * has header in packet or not.
//      * @param packet 
//      * @param field 
//      */
//     hasHeader?(field: string): boolean;
//     /**
//      * get header from packet.
//      * @param packet 
//      * @param field 
//      */
//     getHeader?(field: string): string | undefined;

// }

// /**
//  * Outgoing message.
//  */
// export interface Outgoing<T, TStatus = any> {

//     id?: string | number;
//     type?: string | number | null;

//     pattern?: string;

//     body?: T | null;

//     error?: any;

//     headers: HeadersLike;

//     /**
//      * Get packet status code.
//      *
//      * @return {TStatus}
//      * @api public
//      */
//     get statusCode(): TStatus;
//     /**
//      * Set packet status code.
//      *
//      * @api public
//      */
//     set statusCode(code: TStatus);

//     /**
//      * Get packet status message.
//      *
//      * @return {String}
//      * @api public
//      */
//     get statusMessage(): string;
//     /**
//      * Set packet status message
//      *
//      * @return {TPacket}
//      * @api public
//      */
//     set statusMessage(statusText: string);

//     /**
//      * has header in packet or not.
//      * @param packet 
//      * @param field 
//      */
//     hasHeader(field: string): boolean;
//     /**
//      * get header from packet.
//      * @param packet 
//      * @param field 
//      */
//     getHeader(field: string): string | number | string[] | undefined;
//     /**
//      * Set header `field` to `val` or pass
//      * an object of header fields.
//      *
//      * Examples:
//      *
//      *    this.set('Foo', ['bar', 'baz']);
//      *    this.set('Accept', 'application/json');
//      *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
//      *
//      * @param {String|Object|Array} field
//      * @param {String} val
//      * @api public
//      */
//     setHeader(field: string, val: Header): void;

//     /**
//      * remove header in packet.
//      * @param packet 
//      * @param field 
//      */
//     removeHeader(field: string): void;


//     /**
//      * Check if a header has been written to the socket.
//      *
//      * @return {Boolean}
//      * @api public
//      */
//     sent?: boolean;

//     /**
//      * is writable or not.
//      * @param packet 
//      */
//     writable?: boolean;

// }



// /**
//  * client incoming message.
//  */
// export interface ClientIncoming<T, TStatus = any> extends Outgoing<T, TStatus> {

// }

// /**
//  * Client Outgoing message
//  */
// export interface ClinetOutgoing<T> extends Incoming<T> {

// }


