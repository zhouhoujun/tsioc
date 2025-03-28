import { Injectable } from '@tsdi/ioc';
import { OAuth2Interceptor } from '../oauth2/oauth2.interceptor';
import { OIDCOptions } from './oidc.options';
import { OIDCService } from './oidc.service';
import { RestfulRequestContext } from '@tsdi/endpoints';
import { NoOpenIDExecption } from '../exceptions';
import { Authenticator } from '../Authenticator';

@Injectable()
export class OIDCInterceptor extends OAuth2Interceptor {
    constructor(private oidcService: OIDCService) {
        super();
    }

    protected async handleCallback(ctx: RestfulRequestContext, options: OIDCOptions) {
        const code = ctx.query.code;
        if (!code) {
            throw new NoOpenIDExecption('No authorization code provided', ctx.response);
        }

        // 获取token响应
        const tokenResponse = await this.getAccessToken(code, options);
        
        // 验证ID Token
        await this.oidcService.validateIDToken(tokenResponse.id_token, options);
        
        // 获取用户信息
        const userInfo = await this.oidcService.getUserInfo(tokenResponse.access_token, options);
        
        // 登录用户
        await ctx.get(Authenticator).login(ctx, userInfo);
    }
}
