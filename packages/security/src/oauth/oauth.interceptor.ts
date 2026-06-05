import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor, UnauthorizedException } from '@tsdi/common';
import { getRestfulAdapter } from '../context';
import { Observable, from, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Authenticator } from '../Authenticator';
import { OAuthOption } from './oauth.options';

@Injectable()
export class OAuthInterceptor implements RequestInterceptor<RequestContext, any> {

    intercept(input: RequestContext, next: RequestHandler, context?: any): Observable<any> {
        const option = input.get(OAuthOption);
        const accessToken = this.getAccessToken(input);

        if (!accessToken) {
            // 重定向到授权页面
            return this.redirectToAuth(input, option);
        }

        // 验证 token
        return this.validateToken(accessToken, option).pipe(
            mergeMap(userInfo => {
                return from(input.get(Authenticator).login(input, userInfo))
                    .pipe(
                        mergeMap(() => next.handle(input, context))
                    );
            })
        );
    }

    private getAccessToken(ctx: RequestContext): string | null {
        return getRestfulAdapter(ctx).getHeader('Authorization')?.replace('Bearer ', '') || null;
    }

    private redirectToAuth(ctx: RequestContext, option: OAuthOption): Observable<never> {
        const authUrl = this.buildAuthUrl(option);
        getRestfulAdapter(ctx).redirect(authUrl);
        return throwError(() => new UnauthorizedException('Redirecting to authorization'));
    }

    private buildAuthUrl(option: OAuthOption): string {
        const params = new URLSearchParams({
            client_id: option.clientId,
            redirect_uri: option.callbackURL,
            response_type: 'code',
            scope: (option.scope || []).join(' ')
        });
        return `${option.authorizationURL}?${params.toString()}`;
    }

    private validateToken(token: string, option: OAuthOption): Observable<any> {
        // 实现 token 验证逻辑
        // 这里需要根据具体的 OAuth 提供商实现
        return from(fetch(`${option.tokenURL}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json()));
    }
} 