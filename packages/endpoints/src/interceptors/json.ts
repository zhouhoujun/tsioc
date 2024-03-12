import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { hdr, ctype } from '@tsdi/common/transport';
import { Observable, map } from 'rxjs';
import { Middleware } from '../middleware/middleware';
import { RequestContext } from '../RequestContext';


@Abstract()
export abstract class JsonMiddlewareOption {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}



@Injectable()
export class JsonInterceptor implements Middleware<RequestContext>, Interceptor<RequestContext> {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonMiddlewareOption) {

        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    intercept(input: RequestContext, next: Handler<RequestContext, any>): Observable<any> {
        return next.handle(input)
            .pipe(
                map(res => {
                    this.streamify(input);
                    return res;
                })
            )
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        await next();
        this.streamify(ctx);
    }

    protected streamify(ctx: RequestContext) {
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

