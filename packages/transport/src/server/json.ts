import { AssetContext, Handler, Interceptor, Middleware } from '@tsdi/core';
import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { Observable, map } from 'rxjs';
import { ctype, hdr } from '../consts';


@Abstract()
export abstract class JsonMiddlewareOption {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}



@Injectable()
export class Json implements Middleware<AssetContext>, Interceptor<AssetContext> {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonMiddlewareOption) {

        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    intercept(input: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        return next.handle(input)
            .pipe(
                map(res => {
                    this.streamify(input);
                    return res;
                })
            )
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        await next();
        this.streamify(ctx);
    }

    protected streamify(ctx: AssetContext) {
        const body = ctx.body;
        const strm = ctx.streamAdapter.isStream(body);
        const json = ctx.streamAdapter.isJson(body);

        if (!json && !strm) {
            return;
        }

        const pretty = this.pretty || hasOwn(ctx.query, this.paramName);

        if (strm) {
            ctx.setHeader(hdr.CONTENT_TYPE, ctype.APPL_JSON);
            ctx.body = ctx.streamAdapter.jsonSreamify(body, undefined, pretty ? this.spaces : 2) // new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty) {
            ctx.setHeader(hdr.CONTENT_TYPE, ctype.APPL_JSON_UTF8);
            ctx.body = JSON.stringify(body, null, this.spaces);
        }
    }
}

