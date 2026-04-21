import { Incoming, Outgoing, RequestHandler, RequestInterceptor, RequestContext, ReadableLike, WritableLike, StreamAdapter } from '@tsdi/common';
import { Observable } from 'rxjs';
export declare class BodyparserOptions {
    json?: {
        strict?: boolean;
        limit: string;
    };
    form?: {
        limit: string;
        qs?: {
            parse: Function;
        };
        queryString?: {
            allowDots?: boolean;
        };
    };
    text?: {
        limit: string;
    };
    encoding?: string;
    enableTypes?: string[];
}
export declare class BodyparserInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    private options;
    private enableForm;
    private enableJson;
    private enableText;
    private enableXml;
    constructor(options: BodyparserOptions);
    protected canHanlde(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter): boolean;
    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<any>;
    private parseBody;
    private is;
    protected parseJson(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{
        raw?: any;
        body?: any;
    }>;
    protected unzipify(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter, encoding: string): import("@tsdi/common").IReadable;
    private jsonify;
    protected parseForm(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{
        raw?: any;
        body?: any;
    }>;
    protected parseText(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{
        raw?: any;
        body?: any;
    }>;
    private enableType;
    /**
     * Parse body without HTTP headers (e.g., for TCP microservice mode).
     * Try to detect content type from body content.
     */
    protected parseBodyWithoutHeaders(input: ReadableLike<Incoming>, context: RequestContext): Promise<{
        raw?: any;
        body?: any;
    }>;
}
