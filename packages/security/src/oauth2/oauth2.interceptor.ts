import { Injectable } from '@tsdi/ioc';
import { RequestHandler, RequestInterceptor } from '@tsdi/common';
import { RestfulRequestContext } from '@tsdi/endpoints';
import { Observable, defer, mergeMap } from 'rxjs';
import { Authenticator } from '../Authenticator';
import { OAuth2Options } from './oauth2.options';

@Injectable()
export class OAuth2Interceptor implements RequestInterceptor<RestfulRequestContext, any> {
    intercept(input: RestfulRequestContext, next: RequestHandler, context?: any): Observable<any> {
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

    private isCallback(ctx: RestfulRequestContext): boolean {
        return ctx.path.includes('/oauth/callback');
    }

    protected isAuthenticated(ctx: RestfulRequestContext): boolean {
        // 实现会话检查逻辑
        return !!ctx.session?.user;
    }

    protected async handleCallback(ctx: RestfulRequestContext, options: OAuth2Options) {
        const code = ctx.query.code;
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

    private redirectToAuth(ctx: RestfulRequestContext, options: OAuth2Options): Observable<never> {
        const authUrl = this.buildAuthorizationUrl(options);
        ctx.redirect(authUrl);
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