// import { RequestBase, RequestHeader, TransportContext } from '@tsdi/core';
// import { isArray, isDefined, isString, isUndefined } from '@tsdi/ioc';
// import * as http from 'http';
// import * as http2 from 'http2';
// import { TLSSocket } from 'tls';


// export class HttpRequest<T = any> extends RequestBase<T> implements RequestHeader {

//     constructor(readonly context: TransportContext, readonly req: http.IncomingMessage | http2.Http2ServerRequest) {
//         super()
//         this.context.request = this;
//     }

//     get url(): string {
//         return this.req.url ?? '';
//     }
//     get params(): Record<string, any> {
//         return this.req;
//     }
//     get method(): string {
//         return this.req.method ?? 'GET';
//     }
    
//     /**
//      * Return the protocol string "http" or "https"
//      * when requested with TLS. When the proxy setting
//      * is enabled the "X-Forwarded-Proto" header
//      * field will be trusted. If you're running behind
//      * a reverse proxy that supplies https for you this
//      * may be enabled.
//      *
//      * @return {String}
//      * @api public
//      */
//     get protocol(): string {
//         if ((this.socket as TLSSocket).encrypted) return 'https';
//         // if (!this.get(TransportServer).proxy) return 'http';
//         const proto = this.getHeader('X-Forwarded-Proto') as string;
//         return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http';
//     }

//     /**
//      * Return the request socket.
//      *
//      * @return {Connection}
//      * @api public
//      */

//     get socket() {
//         return this.req.socket;
//     }

//     /**
//      * Short-hand for:
//      *
//      *    this.protocol == 'https'
//      *
//      * @return {Boolean}
//      * @api public
//      */
//     get secure(): boolean {
//         return this.protocol === 'https';
//     }

//     get body(): T | null {
//         return null;
//     }
  
//     isUpdate(): boolean {
//         return this.method === 'PUT';
//     }

//     getHeaders() {
//         return this.req.headers;
//     }
//     hasHeader(field: string): boolean {
//         return isDefined(this.req.headers[field]);
//     }
//     getHeader(field: string): string | number | string[] | undefined {
//         const req = this.req;
//         switch (field = field.toLowerCase()) {
//             case 'referer':
//             case 'referrer':
//                 return req.headers.referrer || req.headers.referer || '';
//             default:
//                 return req.headers[field] || '';
//         }
//     }
//     setHeader(field: string, val: string | number | string[]): void;
//     setHeader(fields: Record<string, string | number | string[]>): void;
//     setHeader(fields: any, val?: any): void {
//         if (isString(fields) && !isUndefined(val)) {
//             this.req.headers[fields] = isArray(val) ? val : val?.toString();
//         } else {
//             for (let k in fields) {
//                 val = fields[k];
//                 if (!isUndefined(val)) {
//                     this.req.headers[k] = isArray(val) ? val : val?.toString();
//                 }
//             }
//         }
//     }
//     removeHeader(field: string): void {
//         this.req.headers[field] = undefined;
//     }

// }