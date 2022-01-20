// import { Abstract, DecorDefine, Destroyable, DestroyCallback, Injector, isArray, isFunction, isString, Token } from '@tsdi/ioc';
// import { HeadersOption } from '../packet';


// /**
//  * context for middlewares.
//  */
//  @Abstract()
//  export abstract class Context implements Destroyable {
//      activeRouteMetadata?: DecorDefine;
//      private _destroyed = false;
//      protected _dsryCbs = new Set<DestroyCallback>();
 
//      set error(err: Error) {
//          this.response.error = err;
//      }
 
//      abstract get request(): Request;
//      abstract get response(): Response;
 
//      get querystring(): string {
//          return this.request.querystring;
//      }
 
//      /**
//       * resetful value. 
//       */
//      restful: any;
//      // set querystring(val: string) {
//      //     this.request.querystring = val;
//      // }
 
//      get search(): string {
//          return this.request.search;
//      }
//      // set search(val: string) {
//      //     this.request.search = val;
//      // }
 
//      get method(): string {
//          return this.request.method;
//      }
//      set method(val: string) {
//          this.request.method = val;
//      }
 
//      get query(): any {
//          return this.request.query;
//      }
//      set query(val: any) {
//          this.request.query = val;
//      }
 
//      get path(): string {
//          return this.request.path;
//      }
//      // set path(path: string) {
//      //     this.request.path = path;
//      // }
 
//      get url(): string {
//          return this.request.url;
//      }
//      set url(val: string) {
//          this.request.url = val;
//      }
 
//      // get accept(): Object {
//      //     return this.request.accept;
//      // }
//      // set accept(val: Object) {
//      //     this.request.accept = val;
//      // }
 
//      get origin(): string {
//          return this.request.origin;
//      }
 
//      get href(): string {
//          return this.request.href;
//      }
 
//      abstract get subdomains(): string[];
 
//      get protocol(): string {
//          return this.request.protocol;
//      }
 
//      get host(): string {
//          return this.request.host;
//      }
 
//      get hostname(): string {
//          return this.request.hostname;
//      }
 
//      /**
//       * injector of.
//       */
//      abstract get injector(): Injector;
 
//      get status(): number {
//          return this.response.status;
//      }
 
//      set status(status: number) {
//          this.response.status = status;
//      }
 
//      get message(): string {
//          return this.response.message;
//      }
//      set message(msg: string) {
//          this.response.message = msg;
//      }
 
//      /**
//       * Get response body.
//       */
//      get body(): any {
//          return this.response.body;
//      }
//      /**
//       * Set response body.
//       */
//      set body(body: any) {
//          this.response.body = body;
//      }
 
//      /**
//       * Get Content-Length.
//       */
//      get length(): number {
//          return this.response.length;
//      }
//      /**
//       * Set Content-Length field to `n`.
//       */
//      set length(val: number) {
//          this.response.length = val;
//      }
 
//      /**
//       * Return the response mime type void of
//       * parameters such as "charset".
//       *
//       * @return {String}
//       * @api public
//       */
//      get type(): string {
//          return this.response.type;
//      }
//      /**
//       * Set Content-Type response header with `type` through `mime.lookup()`
//       * when it does not contain a charset.
//       * or event type.
//       *
//       * Examples:
//       *
//       *     this.type = '.html';
//       *     this.type = 'html';
//       *     this.type = 'json';
//       *     this.type = 'application/json';
//       *     this.type = 'png';
//       *
//       * @param {String} type
//       * @api public
//       */
//      set type(type: string) {
//          this.response.type = type;
//      }
 
//      /**
//       * get value to context
//       * @param token
//       */
//      getValue<T>(token: Token<T>): T {
//          return this.injector.get(token);
//      }
//      /**
//       * set value
//       * @param token
//       * @param value 
//       */
//      setValue(token: Token, value: any): void {
//          this.injector.setValue(token, value);
//      }
 
//      /**
//       * has destoryed or not.
//       */
//      get destroyed() {
//          return this._destroyed;
//      }
//      /**
//      * destroy this.
//      */
//      destroy(): void {
//          if (!this._destroyed) {
//              this._destroyed = true;
//              try {
//                  this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
//              } finally {
//                  this._dsryCbs.clear();
//                  this.destroying();
//              }
//          }
//      }
//      /**
//       * register callback on destroy.
//       * @param callback destroy callback
//       */
//      onDestroy(callback: DestroyCallback): void {
//          this._dsryCbs.add(callback);
//      }
 
//      protected destroying(): void {
//          (this as { request: Request | null }).request = null;
//          (this as { response: Response | null }).response = null;
//          this.injector.destroy();
//          (this as { injector: Injector | null }).injector = null;
//      }
 
//  }
 

//  /**
//  * abstract request.
//  */
// @Abstract()
// export abstract class Request {
//     /**
//      * Get request originalUrl.
//      *
//      * @return {String}
//      * @api public
//      */
//     abstract get originalUrl(): string;
//     /**
//      * Get request URL.
//      *
//      * @return {String}
//      * @api public
//      */
//     abstract get url(): string;
//     /**
//      * Set request URL.
//      *
//      * @api public
//      */
//     abstract set url(url: string);

//     /**
//      * Get origin of URL.
//      *
//      * @return {String}
//      * @api public
//      */
//     get origin() {
//         return this.URL.origin;
//     }

//     /**
//      * Get full request URL.
//      *
//      * @return {String}
//      * @api public
//      */
//     get href() {
//         return this.URL.href;
//     }

//     /**
//      * Get request method.
//      *
//      * @return {String}
//      * @api public
//      */
//     abstract get method(): string;

//     /**
//      * Set request method.
//      *
//      * @param {String} val
//      * @api public
//      */
//     abstract set method(val: string);

//     /**
//      * Get request pathname.
//      *
//      * @return {String}
//      * @api public
//      */
//     get path(): string {
//         return this.URL.pathname;
//     }

//     private _querycache!: Record<string, any>;
//     /**
//      * Get parsed query-string.
//      *
//      * @return {any}
//      * @api public
//      */
//     get query(): Record<string, any> {
//         let qur = this._querycache;
//         if (!qur) {
//             qur = {};
//             this.URL.searchParams.forEach((v, k) => {
//                 qur[k] = v;
//             });
//         }
//         return qur;
//     }
//     /**
//      * Set query-string as an object.
//      *
//      * @param {any} obj
//      * @api public
//      */
//     set query(val: Record<string, any>) {
//         let querystring = '';
//         if (val) {
//             Object.keys(val).forEach((n, idx) => {
//                 querystring = `${querystring}${idx > 0 ? ';' : ''}${n}=${val[n]}`;
//             });
//         }
//         this.querystring = querystring;
//         this._querycache = val;
//     }

//     /**
//      * Get or set request body.
//      *
//      * @return {any}
//      * @api public
//      */
//     body: any;


//     /**
//      * Get query string.
//      *
//      * @return {String}
//      * @api public
//      */
//     get querystring(): string {
//         return this.URL.search.slice(1);
//     }

//     /**
//      * Set querystring.
//      *
//      * @param {String} str
//      * @api public
//      */
//     set querystring(str) {
//         if (this.URL.search === `?${str}`) return;
//         this.URL.search = str;
//         this.url = this.URL.pathname + this.URL.search;
//     }

//     /**
//      * Get the search string. Same as the querystring
//      * except it includes the leading.
//      *
//      * @return {String}
//      * @api public
//      */
//     get search() {
//         return this.URL.search;
//     }

//     /**
//      * Parse the "Host" header field host
//      * and support X-Forwarded-Host when a
//      * proxy is enabled.
//      *
//      * @return {String} hostname:port
//      * @api public
//      */
//     get host(): string {
//         return this.URL.host;
//     }

//     /**
//      * Parse the "Host" header field hostname
//      * and support X-Forwarded-Host when a
//      * proxy is enabled.
//      *
//      * @return {String} hostname
//      * @api public
//      */
//     get hostname(): string {
//         return this.URL.hostname;
//     }

//     protected _URL!: URL;
//     /**
//      * Get WHATWG parsed URL.
//      * Lazily memoized.
//      *
//      * @return {URL|Object}
//      * @api public
//      */
//     get URL(): URL {
//         if (!this._URL) {
//             this._URL = this.parseURL(this.url);
//         }
//         return this._URL;
//     }

//     protected parseURL(url: string) {
//         let uri: URL;
//         url = url.trim();
//         try {
//             if (!/^\w+:\/\//.test(url)) {
//                 url = this.parseOrigin() + (/^\//.test(url) ? '' : '/') + url;
//             }
//             uri = new URL(url);
//         } catch (err) {
//             uri = null!;
//             throw err;
//         }
//         return uri;
//     }

//     protected parseOrigin() {
//         const proto = this.getHeader('X-Forwarded-Proto');
//         let protocol = proto && isString(proto) ? proto.split(/\s*,\s*/, 1)[0] : 'msg'
//         let host = this.getHeader('X-Forwarded-Host') ??
//             this.getHeader(':authority') ?? this.getHeader('Host');
//         return `${protocol}://${host || '0.0.0.0'}`
//     }

//     /**
//      * Return parsed Content-Length when present.
//      *
//      * @return {Number}
//      * @api public
//      */
//     get length(): number {
//         const len = this.getHeaderFirst('Content-Length') || '';
//         if (len === '') return 0;
//         return ~~len;
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
//         return this.URL.protocol;
//     }

//     /**
//      * is the protocol secure or not.
//      */
//     abstract get secure(): boolean;

//     /**
//      * Return the request mime type void of
//      * parameters such as "charset".
//      *
//      * @return {String}
//      * @api public
//      */
//     get type(): string {
//         return this.getHeaderFirst('Content-Type') as string;
//     }

//     getHeaderFirst(name: string): string {
//         const vals = this.getHeader(name);
//         return isArray(vals) ? vals[0] : vals;
//     }

//     abstract getHeaders(): Record<string, string | string[]>;

//     abstract getHeader(name: string): string | string[];

//     abstract hasHeader(name: string): boolean;

//     abstract setHeader(name: string, value: string | string[]): void;

//     abstract removeHeader(name: string): void;

// }



// /**
//  * request init option for {@link Request}.
//  */
// export interface RequestInit {
//     /**
//      * headers options.
//      */
//     headers?: HeadersOption;
//     /**
//      * protocol.
//      */
//     readonly protocol?: string;
//     /**
//      * restful params.
//      */
//     readonly restful?: Record<string, string | number | boolean>;
//     /**
//      * request body.
//      */
//     readonly body?: any;
//     /**
//      * request query params
//      */
//     readonly query?: Record<string, any>;
//     /**
//      * reuqest method
//      */
//     readonly method?: string;
//     /**
//      * event, request type
//      */
//     readonly type?: string;
//     /**
//      * the target raise request.
//      */
//     readonly target?: any;

//     /**
//      * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
//      */
//     referrer?: string;
// }

// /**
//  * Request option for {@link Request}.
//  */
// export interface RequestOption extends RequestInit {

//     /**
//      * request url.
//      */
//     url: string;
// }


// /**
//  * abstract response.
//  */
//  @Abstract()
//  export abstract class Response {
//      /**
//       * Get response status code.
//       *
//       * @return {Number}
//       * @api public
//       */
//      abstract get status(): number;
//      /**
//       * Set response status code.
//       *
//       * @param {Number} code
//       * @api public
//       */
//      abstract set status(code: number);
 
//      get ok(): boolean {
//          return this.status === 200;
//      }
 
//      /**
//       * get response error
//       */
//      abstract get error(): any;
//      /**
//       * set response error
//       */
//      abstract set error(err: any)
 
//      /**
//       * Get response status message
//       *
//       * @return {String}
//       * @api public
//       */
//      abstract get message(): string;
//      /**
//       * Set response status message
//       *
//       * @param {String} msg
//       * @api public
//       */
 
//      abstract set message(msg: string);
 
//      /**
//       * Get response body.
//       *
//       * @return {Mixed}
//       * @api public
//       */
//      abstract get body(): any;
//      /**
//       * Set response body.
//       *
//       * @param {String|Buffer|Object|Stream|Observable<any>} val
//       * @api public
//       */
//      abstract set body(val: any);
 
//      /**
//       * Return parsed response Content-Length when present.
//       *
//       * @return {Number}
//       * @api public
//       */
//      abstract get length(): number;
//      /**
//       * Set Content-Length field to `n`.
//       *
//       * @param {Number} n
//       * @api public
//       */
//      abstract set length(n: number);
 
//      /**
//       * Return the response mime type void of
//       * parameters such as "charset".
//       *
//       * @return {String}
//       * @api public
//       */
//      get type(): string {
//          const type = this.getHeader('Content-Type');
//          if (!type) return '';
//          return type?.toString().split(';', 1)[0];
//      }
//      /**
//       * Set Content-Type response header with `type` through `mime.lookup()`
//       * when it does not contain a charset.
//       *
//       * Examples:
//       *
//       *     this.type = '.html';
//       *     this.type = 'html';
//       *     this.type = 'json';
//       *     this.type = 'application/json';
//       *     this.type = 'png';
//       *
//       * @param {String} type
//       * @api public
//       */
//      set type(type: string) {
//          if (type) {
//              this.setHeader('Content-Type', type);
//          } else {
//              this.removeHeader('Content-Type');
//          }
//      };
 
//      abstract get headersSent(): boolean;
 
//      abstract getHeaders(): Record<string, string | string[] | number>;
 
//      abstract getHeader(name: string): string | string[] | number;
 
//      getHeaderFirst(name: string): string | number {
//          const vals = this.getHeader(name);
//          return isArray(vals) ? vals[0] : vals;
//      }
 
//      abstract hasHeader(name: string): boolean;
 
//      abstract setHeader(name: string, value: number | string | string[]): void;
 
//      abstract removeHeader(name: string): void;
 
//  }
 
//  /**
//   * response init option for {@link Response}.
//   */
//  export interface ResponseOption {
//      headers?: HeadersOption;
//      status?: number;
//      statusText?: string;
//  }
 