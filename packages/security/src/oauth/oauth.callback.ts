import { Injectable } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { Controller, Get } from '@tsdi/service';
import { getRestfulAdapter } from '../context';
import { fetch } from 'cross-fetch';
import { OAuthOption } from './oauth.options';


@Injectable()
@Controller('/oauth')
export class OAuthCallback {

    @Get('/callback')
    async handleCallback(ctx: RequestContext) {
        const option = ctx.get(OAuthOption);
        const code = getRestfulAdapter(ctx).query.code;

        // 使用授权码获取访问令牌
        const tokenResponse = await fetch(option.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: option.callbackURL,
                client_id: option.clientId,
                client_secret: option.clientSecret
            })
        }).then(res => res.json());

        // 存储 token 并重定向到应用
        // 这里需要根据具体应用需求实现
        return tokenResponse;
    }
} 