import { HeaderContext, Middleware, TransportContext } from '@tsdi/core';
import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { ctype, hdr } from '../consts';
import { JsonStreamStringify } from '../stringify';
import { isJson, isStream } from '../utils';

@Abstract()
export abstract class JsonMiddlewareOption {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}


@Injectable()
export class EncodeJsonMiddleware implements Middleware {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonMiddlewareOption) {
        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    async invoke(ctx: TransportContext & HeaderContext, next: () => Promise<void>): Promise<void> {

        await next();

        const body = ctx.body;
        const strm = isStream(body);
        const json = isJson(body);

        if (!json && !strm) {
            return;
        }

        const pretty = this.pretty || hasOwn(ctx.query, this.paramName);

        if (strm) {
            // resp.contentType = 'application/json';
            ctx.setHeader(hdr.CONTENT_TYPE, ctype.APPL_JSON);
            ctx.body = new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty) {
            // resp.contentType = 'application/json; charset=utf-8';
            ctx.setHeader(hdr.CONTENT_TYPE, ctype.APPL_JSON_UTF8);
            ctx.body = JSON.stringify(body, null, this.spaces);
        }

    }
}

