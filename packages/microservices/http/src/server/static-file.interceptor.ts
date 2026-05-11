import { Observable, from, mergeMap, of } from 'rxjs';
import { Incoming, Outgoing, RequestContext, ReadableLike, RequestInterceptor, RequestHandler, WritableLike } from '@tsdi/common';
import { HttpFileResult } from './file-result';
import { HttpStaticOptions, isHttpFileResult, normalizeStaticOptions, resolveFileResult, resolveStaticFile } from './static-file';

export class StaticFileInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    private readonly options: HttpStaticOptions[];

    constructor(options?: boolean | HttpStaticOptions | HttpStaticOptions[]) {
        this.options = normalizeStaticOptions(options);
    }

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<any> {
        return from(resolveStaticFile(input, context, this.options))
            .pipe(
                mergeMap(staticResponse => {
                    if (staticResponse) {
                        return of(staticResponse);
                    }
                    return next.handle(input, context)
                        .pipe(
                            mergeMap(response => from(this.mapResponse(response, input, context)))
                        );
                })
            );
    }

    private async mapResponse(response: any, input: ReadableLike<Incoming>, context: RequestContext): Promise<any> {
        if (isHttpFileResult(response)) {
            return resolveFileResult(response, input, context);
        }
        if (response?.body instanceof HttpFileResult) {
            const resolved = await resolveFileResult(response.body, input, context);
            const headerNames = response.getHeaderNames?.() ?? [];
            headerNames.forEach((name: string) => {
                if (!resolved.hasHeader(name)) {
                    resolved.setHeader(name, response.getHeader(name));
                }
            });
            if (response.statusCode && !resolved.statusCode) {
                resolved.statusCode = response.statusCode;
            }
            return resolved;
        }
        return response;
    }
}
