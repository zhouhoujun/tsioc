import { Abstract, hasOwn, Injectable, Nullable } from '@tsdi/ioc';
import { CONTENT_TYPE, MessageAdapter, RequestContext, RequestHandler, RequestInterceptor, ContentType, ReadableLike, Incoming, StreamAdapter } from '@tsdi/common';
import { Observable, map } from 'rxjs';


@Abstract()
export abstract class JsonOptions {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}



@Injectable()
export class HttpJsonInterceptor implements RequestInterceptor<ReadableLike<Incoming>> {
    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(@Nullable() option: JsonOptions) {

        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                map(res => {
                    return this.streamify(input, res, context);
                })
            )
    }

    protected streamify(input: ReadableLike<Incoming>, res: any, context: RequestContext) {
        const adapter = context.get(MessageAdapter) as MessageAdapter & {
            getBody?: () => any;
            getResponseHeader?: (name: string) => string | undefined;
        };
        if (adapter?.getBody?.() != null) {
            return res;
        }

        const streamAdapter = context.get(StreamAdapter);
        const strm = streamAdapter.isStream(res);
        const json = streamAdapter.isJson(res);

        if (!json && !strm) {
            return;
        }

        const pretty = this.pretty || hasOwn(input.query, this.paramName);
        const responseType = String(adapter?.getResponseHeader?.('content-type') ?? context.get(CONTENT_TYPE) ?? '').toLowerCase();
        const expectsJson = !responseType || responseType.includes('/json') || responseType.includes('+json');

        if (strm && expectsJson && adapter?.accepts('json')) {
            context.set(CONTENT_TYPE, ContentType.APPL_JSON);
            return streamAdapter.jsonSreamify(res, undefined, pretty ? this.spaces : 2);
        } else if (json && pretty && expectsJson) {
            context.set(CONTENT_TYPE, ContentType.APPL_JSON_UTF8);
            return JSON.stringify(res, null, this.spaces);
        }

        return res;
    }
}
