import { Injectable } from '@tsdi/ioc';
import { RequestInterceptor, RequestHandler, RequestContext } from '@tsdi/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { InjectLog, Logger } from '@tsdi/logger';

@Injectable()
export class HttpLoggerInterceptor implements RequestInterceptor {

    @InjectLog() logger!: Logger;

    intercept(input: any, next: RequestHandler, context: RequestContext): Observable<any> {
        const url = context.get('url') || '/';
        const method = context.get('method') || 'GET';
        const req = context.get('request') as any;
        const userAgent = req?.headers?.['user-agent'] ?? 'unknown';

        this.logger.info(`[HTTP] ${method} ${url} - ${userAgent}`);

        const startTime = Date.now();

        return next.handle(input, context).pipe(
            tap((response: any) => {
                const duration = Date.now() - startTime;
                const res = context.get('response') as any;
                const statusCode = res?.statusCode ?? 200;
                const length = typeof response === 'string' || Buffer.isBuffer(response)
                    ? response.length
                    : JSON.stringify(response || '').length;
                this.logger.info(`[HTTP] ${url} - Status: ${statusCode} - ${length} bytes - ${duration}ms`);
            }),
            catchError((err: any) => {
                this.logger.error(`[HTTP] ${url} - Error: ${err.message}`, err);
                return throwError(() => err);
            })
        );
    }
}
