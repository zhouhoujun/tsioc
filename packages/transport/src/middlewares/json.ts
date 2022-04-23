import { Middleware, TransportContext } from '@tsdi/core';
import { hasOwn, Injectable, isString } from '@tsdi/ioc';
import { hdrs } from '../consts';
import { JsonStreamStringify } from '../stringify';
import { isBuffer, isStream } from '../utils';



@Injectable()
export class EncodeJsonMiddleware implements Middleware {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(option: JsonMiddlewareOption) {
        this.pretty = option.pretty ?? true;
        this.spaces = option.spaces ?? 2;
        this.paramName = option.param ?? '';
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {

        await next();

        let body = ctx.body;
        let strm = isStream(body);
        let json = !body && !isString(body) && !strm && isBuffer(body);

        if (!json && !strm) {
            return;
        }

        let pretty = this.pretty || hasOwn(ctx.query, this.paramName);

        if (strm) {
            // resp.contentType = 'application/json';
            ctx.setHeader(hdrs.CONTENT_TYPE, 'application/json');
            ctx.body = new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty) {
            // resp.contentType = 'application/json; charset=utf-8';
            ctx.setHeader(hdrs.CONTENT_TYPE, 'application/json; charset=utf-8');
            ctx.body = JSON.stringify(body, null, this.spaces);
        }

    }
}

export interface JsonMiddlewareOption {
    pretty: boolean;
    param?: string;
    spaces?: number;
}
