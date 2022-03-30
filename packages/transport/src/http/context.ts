import { HttpEvent, HttpRequest, HttpResponse, HttpStatusCode, Protocol, TransportContext, TransportError, TransportOption, TransportStatus } from '@tsdi/core';
import { Injector } from '@tsdi/ioc';


export class HttpContext extends TransportContext {

    constructor(readonly request: HttpRequest, readonly response: HttpEvent, injector: Injector, options: TransportOption) {
        super(injector, options);
    }

    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }
    get pattern(): string {
        throw new Error('Method not implemented.');
    }
    isUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
    get query(): any {
        throw new Error('Method not implemented.');
    }
    get restful(): Record<string, string | number> {
        throw new Error('Method not implemented.');
    }
    set restful(value: Record<string, string | number>) {
        throw new Error('Method not implemented.');
    }

    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(value: boolean) {
        throw new Error('Method not implemented.');
    }
    get message(): string {
        throw new Error('Method not implemented.');
    }
    set message(msg: string) {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(body: any) {
        throw new Error('Method not implemented.');
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
    redirect(url: string, alt?: string): void {
        throw new Error('Method not implemented.');
    }


    /**
     * Set Content-Disposition header to "attachment" with optional `filename`.
     *
     * @param filname file name for download.
     * @param options content disposition.
     * @api public
     */
    attachment(filename: string, options?: {
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
    }): void {
        throw new Error('Method not implemented.');
    }

    write(chunk: string | Uint8Array, cb?: (error: Error | null | undefined) => void): boolean;
    write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: (error: Error | null | undefined) => void): boolean;
    write(chunk: string | Uint8Array, arg1?: BufferEncoding | ((error: Error | null | undefined) => void), cb?: (error: Error | null | undefined) => void): boolean {
        throw new Error('Method not implemented.');
    }

    throwError(status: TransportStatus, ...messages: string[]): TransportError<TransportStatus> {
        throw new Error('Method not implemented.');
    }

}