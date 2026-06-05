import { Injectable } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { OAuth2Interceptor } from '../oauth2/oauth2.interceptor';
import { OIDCOptions } from './oidc.options';
import { OIDCService } from './oidc.service';
import { getRestfulAdapter } from '../context';
import { NoOpenIDException } from '../exceptions';
import { Authenticator } from '../Authenticator';

@Injectable()
export class OIDCInterceptor extends OAuth2Interceptor {
    constructor(private oidcService: OIDCService) {
        super();
    }

    protected async handleCallback(ctx: RequestContext, options: OIDCOptions) {
        const adapter = getRestfulAdapter(ctx);
        const code = adapter.query.code;
        if (!code) {
            throw new NoOpenIDException('No authorization code provided', adapter.response);
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
