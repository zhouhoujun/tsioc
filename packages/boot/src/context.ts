import { Abstract } from '@tsdi/ioc';
import { Context, Request, Response } from '@tsdi/core';
import { HttpStatusCode } from './status';




@Abstract()
export abstract class HttpRequest extends Request {
    /**
     * Short-hand for:
     *
     *    this.protocol == 'https'
     *
     * @return {Boolean}
     * @api public
     */
    get secure() {
        return 'https' === this.protocol;
    }
}

const empty: any = {
    204: true,
    205: true,
    304: true
};

@Abstract()
export abstract class HttpResponse extends Response {
    abstract get status(): HttpStatusCode;
    abstract set status(code: HttpStatusCode);
}

@Abstract()
export abstract class HttpContext extends Context {

    abstract get request(): HttpRequest;
    abstract get response(): HttpResponse;

    get status(): HttpStatusCode {
        return this.response.status;
    }

    set status(code: HttpStatusCode) {
        this.response.status = code;
    }


    get secure(): boolean {
        return this.request.secure;
    }

    private _err!: Error;
    set error(err: Error) {
        this._err = err;
        if (err) {
            this.message = err.stack ?? err.message;
            this.status = HttpStatusCode.InternalServerError;
        }
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
     * @param {String} filename
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
}