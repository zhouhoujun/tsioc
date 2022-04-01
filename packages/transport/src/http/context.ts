import { HttpStatusCode, Protocol, TransportContext, TransportError, TransportMiddleware, TransportOption, TransportStatus } from '@tsdi/core';
import { Abstract, Injector } from '@tsdi/ioc';


export type HttpMiddleware = TransportMiddleware<HttpContext>;

@Abstract()
export abstract class HttpContext extends TransportContext {

    constructor(injector: Injector, options: TransportOption) {
        super(injector, options);
    }

    /**
     * Short-hand for:
     *
     *    this.protocol == 'https'
     *
     * @return {Boolean}
     * @api public
     */
    get secure(): boolean {
        return this.protocol === 'https';
    }

    get contentType(): string {
        return this.response.headers.get('Content-Type') ?? '';
    }

    set contentType(contentType: string) {
        this.response.headers.set('Content-Type', contentType);
    }

    get status(): HttpStatusCode {
        return this.response.status;
    }

    set status(code: HttpStatusCode) {
        this.response.status = code;
    }


    private _err!: Error;
    set error(err: Error) {
        this._err = err;
        if (err) {
            this.message = err.stack ?? err.message;
            this.status = HttpStatusCode.InternalServerError;
        }
    }

    get error() {
        return this._err;
    }

    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    abstract redirect(url: string, alt?: string): void;


    /**
     * Set Content-Disposition header to "attachment" with optional `filename`.
     *
     * @param filname file name for download.
     * @param options content disposition.
     * @api public
     */
    abstract attachment(filename: string, options?: {
        /**
        * Specifies the disposition type.
        * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
        * but can convey additional information if both parties agree to it).
        * The `type` is normalized to lower-case.
        * @default 'attachment'
        */
        type?: 'attachment' | 'inline' | string | undefined;
        /**
         * If the filename option is outside ISO-8859-1,
         * then the file name is actually stored in a supplemental field for clients
         * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
         * @default true
         */
        fallback?: string | boolean | undefined;
    }): void;

    abstract write(chunk: string | Uint8Array, cb?: (error: Error | null | undefined) => void): boolean;
    abstract write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: (error: Error | null | undefined) => void): boolean;

    abstract throwError(status: TransportStatus, ...messages: string[]): TransportError<TransportStatus>;

    static create(injector: Injector, options?: TransportOption): HttpContext {
        throw new Error('Method not implemented.');
    }
}