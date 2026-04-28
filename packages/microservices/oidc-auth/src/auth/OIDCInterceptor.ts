import { Injectable } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { RestfulRequestContext } from '@tsdi/endpoints';
import { Authenticator } from '@tsdi/security';
import { Observable, from, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { OIDCService } from './OIDCService';

@Injectable()
export class OIDCInterceptor implements ApplicationInterceptor<RestfulRequestContext, any> {
    
    constructor(private oidcService: OIDCService) {}

    intercept(input: RestfulRequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        const accessToken = this.getAccessToken(input);

        if (!accessToken) {
            return from(this.oidcService.authenticate((input.request, input.response);
        }

        return this.validateToken(accessToken).pipe(
            mergeMap(userInfo => {
                return from(input.get(Authenticator).login(input, userInfo))
                    .pipe(mergeMap(() => next.handle(input, context)));
            })
        );
    }

    private getAccessToken(ctx: RestfulRequestContext): string | null {
        // 从请求中获取token
        return ctx.req.headers.authorization?.split(' ')[1] || null;
    }

    private validateToken(token: string): Observable<any> {
        // 验证token逻辑
        return from(Promise.resolve({}));
    }
}
