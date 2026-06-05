import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor, StatusMessageAdapter } from '@tsdi/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { InjectLog, Logger } from '@tsdi/logger';
import { HttpHandlerOutput, HttpRequestMessage } from '../http-context';
import { HttpMessageAdapter } from '../message-adapter';

@Injectable()
export class HttpLoggerInterceptor implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    @InjectLog() logger!: Logger;

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const req = input;
        const url = req?.url || '/';
        const method = req?.method || 'GET';
        const userAgent = req?.headers?.['user-agent'] ?? 'unknown';

        this.logger.info(`[HTTP] ${method} ${url} - ${userAgent}`);

        const startTime = Date.now();

        return next.handle(input, context).pipe(
            tap((response: any) => {
                const duration = Date.now() - startTime;
                const adapter = context.get(StatusMessageAdapter);
                const statusCode = adapter?.getStatus() ?? 200;
                const body = adapter?.getBody();
                const length = typeof body === 'string' || Buffer.isBuffer(body)
                    ? body.length
                    : typeof response === 'string' || Buffer.isBuffer(response)
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
