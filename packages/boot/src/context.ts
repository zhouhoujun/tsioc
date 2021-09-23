import { Abstract, Injector } from '@tsdi/ioc';
import { Context, Headers, HeadersBase, HeadersOption, Request, Response } from '@tsdi/core';
import { HttpStatusCode } from './status';



export class HttpHeaders extends HeadersBase {

}

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
            this.status = 500;
        }
    }
}