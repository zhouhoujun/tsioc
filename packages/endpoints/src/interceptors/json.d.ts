import { RequestContext, RequestHandler, RequestInterceptor, ReadableLike, Incoming } from '@tsdi/common';
import { Observable } from 'rxjs';
export declare abstract class JsonOptions {
    pretty?: boolean;
    param?: string;
    spaces?: number;
}
export declare class JsonInterceptor implements RequestInterceptor<ReadableLike<Incoming>> {
    private pretty;
    private spaces;
    private paramName;
    constructor(option: JsonOptions);
    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any>;
    protected streamify(input: ReadableLike<Incoming>, res: any, context: RequestContext): string | import("@tsdi/common").IReadable | undefined;
}
