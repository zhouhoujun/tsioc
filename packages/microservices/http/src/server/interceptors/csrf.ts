import { Abstract, Injectable, Inject, Nullable, token } from '@tsdi/ioc';
import { GET, HEAD, OPTIONS, RequestInterceptor, RequestHandler, ForbiddenException, RequestContext } from '@tsdi/common';
import { Observable, throwError } from 'rxjs';
import * as CSRFTokens from 'csrf';
import * as http from 'node:http';
import { HttpHandlerOutput, HttpRequestMessage, HTTP_SESSION } from '../http-context';

@Abstract()
export abstract class CsrfOptions {
    invalidTokenMessage?: string | ((req: http.IncomingMessage) => string);
    excludedMethods?: string[];
    disableQuery?: boolean;
    saltLength?: number;
    secretLength?: number;
}

const defOpts = {
    invalidTokenMessage: 'Invalid CSRF token',
    excludedMethods: [GET, HEAD, OPTIONS],
    disableQuery: false
} as CsrfOptions;

export const CSRF = token<string>('CSRF');

export interface Tokens {
    create(secret: string): string;
    secret(): Promise<string>;
    secret(callback: (err: Error | null, secret: string) => void): void;
    secretSync(): string;
    verify(secret: string, token: string): boolean;
}

@Injectable()
export class CsrfTokensFactory {
    create(options: CsrfOptions): Tokens {
        return new CSRFTokens(options) as unknown as Tokens;
    }
}

@Injectable()
export class Csrf implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    private options: CsrfOptions;
    private tokens: Tokens;

    constructor(@Inject() factory: CsrfTokensFactory, @Nullable() options: CsrfOptions) {
        this.options = { ...defOpts, ...options };
        this.tokens = factory.create(this.options);
    }

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const session = context.get(HTTP_SESSION) as { secret?: string } | undefined;
        const req = input;
        const method = req.method as string;

        if (!session || this.options.excludedMethods?.indexOf(method) !== -1) {
            return next.handle(input, context);
        }

        if (!session.secret) {
            session.secret = this.tokens.secretSync();
        }

        const reqHeaders = req.headers;
        const bodyToken = (input as any)?.body && typeof (input as any).body._csrf === 'string'
            ? (input as any).body._csrf
            : false;

        const query = req.query as Record<string, any> | undefined;
        const token = bodyToken
            || (!this.options.disableQuery && query?._csrf)
            || reqHeaders[CSRF_TOKEN] as string
            || reqHeaders[XSRF_TOKEN] as string
            || reqHeaders[X_CSRF_TOKEN] as string
            || reqHeaders[X_XSRF_TOKEN] as string;

        if (!token) {
            return throwError(() => new ForbiddenException(
                typeof this.options.invalidTokenMessage === 'function'
                    ? this.options.invalidTokenMessage(req as http.IncomingMessage)
                    : this.options.invalidTokenMessage
            ));
        }

        if (!this.tokens.verify(session.secret, token)) {
            return throwError(() => new ForbiddenException(
                typeof this.options.invalidTokenMessage === 'function'
                    ? this.options.invalidTokenMessage(req as http.IncomingMessage)
                    : this.options.invalidTokenMessage
            ));
        }

        return next.handle(input, context);
    }
}

export { Csrf as CsrfMiddleware, Csrf as CsrfInterceptor };

const CSRF_TOKEN = 'csrf-token';
const XSRF_TOKEN = 'xsrf-token';
const X_CSRF_TOKEN = 'x-csrf-token';
const X_XSRF_TOKEN = 'x-xsrf-token';
