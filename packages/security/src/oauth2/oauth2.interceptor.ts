import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { getRestfulAdapter } from '../context';
import { Observable, defer, mergeMap } from 'rxjs';
import { Authenticator } from '../Authenticator';
import { OAuth2Options } from './oauth2.options';

@Injectable()
export class OAuth2Interceptor implements RequestInterceptor<RequestContext, any> {
    intercept(input: RequestContext, next: RequestHandler, context?: any): Observable<any> {
        const options = input.get(OAuth2Options);
        
        // 检查是否是 OAuth 回调
        if (this.isCallback(input)) {
            return defer(() => this.handleCallback(input, options))
                .pipe(
                    mergeMap(() => next.handle(input, context))
                );
        }

        // 检查是否已认证
        if (!this.isAuthenticated(input)) {
            // 重定向到授权页面
            return this.redirectToAuth(input, options);
        }

        return next.handle(input, context);
    }

    private isCallback(ctx: RequestContext): boolean {
        return getRestfulAdapter(ctx).path.includes('/oauth/callback');
    }

    protected isAuthenticated(ctx: RequestContext): boolean {
        // 实现会话检查逻辑
        return !!getRestfulAdapter(ctx).session?.user;
    }

    protected async handleCallback(ctx: RequestContext, options: OAuth2Options) {
        const code = getRestfulAdapter(ctx).query.code;
        if (!code) {
            throw new Error('No authorization code provided');
        }

        // 获取访问令牌
        const tokenResponse = await this.getAccessToken(code, options);
        
        // 获取用户信息
        const userInfo = await this.getUserInfo(tokenResponse.access_token);

        // 使用 Authenticator 登录
        await ctx.get(Authenticator).login(ctx, userInfo);
    }

    protected async getAccessToken(code: string, options: OAuth2Options): Promise<any> {
        // 实现获取访问令牌的逻辑
    }

    protected async getUserInfo(accessToken: string): Promise<any> {
        // 实现获取用户信息的逻辑
    }

    private redirectToAuth(ctx: RequestContext, options: OAuth2Options): Observable<never> {
        const authUrl = this.buildAuthorizationUrl(options);
        getRestfulAdapter(ctx).redirect(authUrl);
        return new Observable(); // 终止后续处理
    }

    private buildAuthorizationUrl(options: OAuth2Options): string {
        const params = new URLSearchParams({
            client_id: options.clientId,
            redirect_uri: options.callbackURL,
            response_type: 'code',
            scope: (options.scope || []).join(' ')
        });

        return `${options.authorizationURL}?${params.toString()}`;
    }
} 