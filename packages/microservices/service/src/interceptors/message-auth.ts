import * as http from 'http';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { HttpStatusCode, RequestContext, RequestHandler, StatusMessageAdapter, UnauthorizedException } from '@tsdi/common';
import { Inject, Injectable, Injector, Optional } from '@tsdi/ioc';
import { defer, from, mergeMap, Observable, throwError } from 'rxjs';
import { AuthOptions, JwtAuthOptions } from '../options';
import { SERVICE_AUTH_OPTIONS } from '../provider';
import { AuthInterceptor } from './auth';

type AuthResult = { authenticated: boolean; token: string | null; claims?: any };

@Injectable()
export class MessageAuthInterceptor implements AuthInterceptor<any, any, RequestContext> {
    constructor(
        @Optional() @Inject(SERVICE_AUTH_OPTIONS) private serviceOptions: AuthOptions | null,
    ) {
    }

    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const authOptions = this.resolveAuthOptions(context);
        const hasConcreteStrategy = !!authOptions && typeof authOptions === 'object' && !!(authOptions.bearerToken || authOptions.jwt);
        if (!hasConcreteStrategy) {
            const err = new UnauthorizedException('Authentication is enabled but no auth strategy is configured', HttpStatusCode.InternalServerError) as UnauthorizedException & { expose?: boolean };
            err.expose = true;
            return throwError(() => err);
        }

        const safeAuthOptions = { allowQueryToken: false, allowWebSocketProtocolToken: true, ...authOptions };
        const request = this.toRequest(input, context);

        return defer(() => from(this.authenticate(request, safeAuthOptions))).pipe(
            mergeMap((result: AuthResult) => {
                if (!result.authenticated) {
                    const err = new UnauthorizedException('Unauthorized', HttpStatusCode.Unauthorized) as UnauthorizedException & { expose?: boolean };
                    err.expose = true;
                    return throwError(() => err);
                }

                const req = input as Record<string, any>;
                req._auth = result;
                if (result.claims) {
                    req.user = result.claims;
                }
                return next.handle(input, context);
            })
        );
    }

    protected toRequest(input: any, context: RequestContext): http.IncomingMessage {
        const adapter = context.get(StatusMessageAdapter) as StatusMessageAdapter | null;
        const headers = this.readHeaders(adapter, input);
        const url = this.resolveUrl(adapter, input, headers);
        return {
            headers,
            url,
            method: input?.method
        } as http.IncomingMessage;
    }

    protected resolveAuthOptions(context: RequestContext): AuthOptions | null {
        if (this.serviceOptions) {
            return this.serviceOptions;
        }
        try {
            const injector = context.getInjector?.() ?? context.get(Injector);
            return injector?.get?.(SERVICE_AUTH_OPTIONS, null) ?? null;
        } catch {
            return null;
        }
    }

    protected extractToken(req: http.IncomingMessage, options: AuthOptions = {}): string | null {
        const auth = req.headers['authorization'] as string | undefined;
        if (auth?.startsWith('Bearer ')) {
            return auth.slice(7).trim();
        }

        if (options.allowWebSocketProtocolToken !== false) {
            const wsProtocol = req.headers['sec-websocket-protocol'] as string | undefined;
            if (wsProtocol) {
                for (const protocol of wsProtocol.split(/\s*,\s*/)) {
                    if (protocol.startsWith('bearer.')) {
                        return protocol.slice(7).trim();
                    }
                }
            }
        }

        if (options.allowQueryToken !== false) {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            const token = url.searchParams.get(options.tokenQueryName ?? 'token');
            if (token) {
                return token;
            }
        }

        return null;
    }

    protected verifyBearerToken(token: string | null, expectedToken?: string): boolean {
        if (!expectedToken || !token) {
            return false;
        }
        const actual = Buffer.from(token);
        const expected = Buffer.from(expectedToken);
        if (actual.length !== expected.length) {
            return false;
        }
        return crypto.timingSafeEqual(actual, expected);
    }

    protected async verifyJwtToken(token: string | null, options?: JwtAuthOptions): Promise<any> {
        if (!token || !options) {
            return null;
        }
        return new Promise((resolve, reject) => {
            jwt.verify(token, options.publicKey || process.env.JWT_SECRET || 'default-secret', {
                issuer: options.issuer,
                audience: options.audience,
                algorithms: options.algorithms as jwt.Algorithm[] | undefined,
                clockTolerance: options.clockTolerance || 30
            }, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    protected async authenticate(req: http.IncomingMessage, options: AuthOptions = {}): Promise<AuthResult> {
        const token = this.extractToken(req, options);
        if (!options.bearerToken && !options.jwt) {
            return {
                authenticated: true,
                token
            };
        }

        if (options.bearerToken && this.verifyBearerToken(token, options.bearerToken)) {
            return {
                authenticated: true,
                token
            };
        }

        if (options.jwt) {
            try {
                const claims = await this.verifyJwtToken(token, options.jwt);
                if (claims) {
                    return {
                        authenticated: true,
                        token,
                        claims
                    };
                }
            } catch {
            }
        }

        return {
            authenticated: false,
            token
        };
    }

    protected readHeaders(adapter: StatusMessageAdapter | null, input: any): http.IncomingHttpHeaders {
        const rawHeaders = (adapter?.read?.('headers') ?? input?.headers ?? {}) as Record<string, any>;
        return Object.keys(rawHeaders).reduce((headers, name) => {
            headers[name.toLowerCase()] = rawHeaders[name];
            return headers;
        }, {} as http.IncomingHttpHeaders);
    }

    protected resolveUrl(adapter: StatusMessageAdapter | null, input: any, headers: http.IncomingHttpHeaders): string {
        const base = `http://${headers.host ?? 'localhost'}`;
        const topic = adapter?.read?.('topic') ?? input?.topic ?? input?.url ?? input?.pattern ?? '/';
        const query = adapter?.read?.('query') ?? input?.query;
        const pathname = typeof topic === 'string' && topic.length ? topic : '/';
        const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base);
        if (query && typeof query === 'object') {
            Object.keys(query).forEach((name) => {
                const value = query[name];
                if (value !== undefined && value !== null) {
                    url.searchParams.set(name, String(value));
                }
            });
        }
        return `${url.pathname}${url.search}`;
    }
}
