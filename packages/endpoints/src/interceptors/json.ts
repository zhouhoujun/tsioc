import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor, ContentType } from '@tsdi/common';
import { Observable, map } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';


@Abstract()
export abstract class JsonOptions {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}



@Injectable()
export class JsonInterceptor implements RequestInterceptor<AbstractRequestContext> {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonOptions) {

        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    intercept(input: AbstractRequestContext, next: RequestHandler<AbstractRequestContext, any>, context: RequestContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                map(res => {
                    this.streamify(input);
                    return res;
                })
            )
    }

    protected streamify(ctx: AbstractRequestContext) {
        const body = ctx.body;
        const strm = ctx.streamAdapter.isStream(body);
        const json = ctx.streamAdapter.isJson(body);

        if (!json && !strm) {
            return;
        }

        const pretty = this.pretty || hasOwn(ctx.query, this.paramName);

        if (strm && ctx.accepts('json')) {
            ctx.contentType = ContentType.APPL_JSON;
            // ctx.body = ctx.streamAdapter.jsonSreamify(body, undefined, pretty ? this.spaces : 2) 
            // new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty) {
            ctx.contentType = ContentType.APPL_JSON_UTF8;
            ctx.body = JSON.stringify(body, null, this.spaces);
        }
    }
}

