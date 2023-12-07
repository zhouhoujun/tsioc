import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { TransportContext, Middleware } from '@tsdi/endpoints';
import { Observable, map } from 'rxjs';
import { ctype } from '../consts';


@Abstract()
export abstract class JsonMiddlewareOption {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}



@Injectable()
export class Json implements Middleware<TransportContext>, Interceptor<TransportContext> {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonMiddlewareOption) {

        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    intercept(input: TransportContext, next: Handler<TransportContext, any>): Observable<any> {
        return next.handle(input)
            .pipe(
                map(res => {
                    this.streamify(input);
                    return res;
                })
            )
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        await next();
        this.streamify(ctx);
    }

    protected streamify(ctx: TransportContext) {
        const adapter = ctx.session.outgoingAdapter;
        if (!adapter) return;

        const body = ctx.body;
        const strm = ctx.streamAdapter.isStream(body);
        const json = ctx.streamAdapter.isJson(body);

        if (!json && !strm) {
            return;
        }

        const pretty = this.pretty || hasOwn(ctx.query, this.paramName);

        if (strm) {
            ctx.contentType = ctype.APPL_JSON;
            ctx.body = ctx.streamAdapter.jsonSreamify(body, undefined, pretty ? this.spaces : 2) // new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty) {
            ctx.contentType = ctype.APPL_JSON_UTF8;
            ctx.body = JSON.stringify(body, null, this.spaces);
        }
    }
}

