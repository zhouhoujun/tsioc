import { Inject, Injectable, Optional, token } from '@tsdi/ioc';
import { HttpStatusCode, RequestContext, RequestHandler, RequestInterceptor, UnauthorizedException } from '@tsdi/common';
import { defer, from, mergeMap, Observable, throwError } from 'rxjs';
import { HttpAuthOptions, HttpAuthService } from '@tsdi/security';
import { SERVICE_AUTH_OPTIONS } from '@tsdi/service';
import { HttpRequestMessage, HttpRequestAuth, HTTP_AUTH_RESULT } from '../http-context';

export const HTTP_AUTH_OPTIONS = token<HttpAuthOptions>('HTTP_AUTH_OPTIONS');

@Injectable()
export class HttpAuthInterceptor implements RequestInterceptor<HttpRequestMessage, any, RequestContext> {
    constructor(
        @Optional() @Inject(HTTP_AUTH_OPTIONS) private options: HttpAuthOptions | null,
        @Optional() @Inject(SERVICE_AUTH_OPTIONS) private serviceOptions: HttpAuthOptions | null,
        @Optional() @Inject(HttpAuthService) private httpAuth: HttpAuthService | null
    ) {
    }

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, any, RequestContext>, context: RequestContext): Observable<any> {
        const authOptions = this.options ?? this.serviceOptions;
        const hasConcreteStrategy = !!authOptions && typeof authOptions === 'object' && !!((authOptions as any).bearerToken || (authOptions as any).jwt);
        if (!hasConcreteStrategy) {
            const err = new UnauthorizedException('Authentication is enabled but no auth strategy is configured', HttpStatusCode.InternalServerError) as UnauthorizedException & { expose?: boolean };
            err.expose = true;
            return throwError(() => err);
        }

        const service = this.httpAuth ?? new HttpAuthService();
        const safeAuthOptions = { allowQueryToken: false, ...authOptions };
        return defer(() => from(service.authenticate(input as any, safeAuthOptions))).pipe(
            mergeMap(result => {
                const auth = result as HttpRequestAuth;
                input._auth = auth;
                context.set(HTTP_AUTH_RESULT, auth);
                if (!auth.authenticated) {
                    const err = new UnauthorizedException('Unauthorized', HttpStatusCode.Unauthorized) as UnauthorizedException & { expose?: boolean };
                    err.expose = true;
                    return throwError(() => err);
                }
                return next.handle(input, context);
            })
        );
    }
}

export function getHttpAuth(context: RequestContext): HttpRequestAuth | null {
    return context.get(HTTP_AUTH_RESULT);
}
