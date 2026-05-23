import { Controller, Get, RequestParam, RestfulRequestContext } from '@tsdi/service';
import { OIDCService } from '../auth/OIDCService';

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

    @Get('/login')
    login(ctx: RestfulRequestContext) {
        const challenge = this.oidcService.authenticate();
        ctx.cookies.set('oidc_state', challenge.state, { httpOnly: true, sameSite: 'lax', secure: ctx.secure });
        ctx.cookies.set('oidc_nonce', challenge.nonce, { httpOnly: true, sameSite: 'lax', secure: ctx.secure });
        return challenge.url;
    }

    @Get('/callback')
    callback(ctx: RestfulRequestContext, @RequestParam('code') code: string, @RequestParam('state') state: string) {
        const expectedState = ctx.cookies.get('oidc_state') || '';
        const expectedNonce = ctx.cookies.get('oidc_nonce') || '';
        ctx.cookies.set('oidc_state');
        ctx.cookies.set('oidc_nonce');
        return this.oidcService.authenticateCallback(code, state, expectedState, expectedNonce);
    }

    @Get('/logout')
    logout(ctx: RestfulRequestContext) {
        ctx.cookies.set('oidc_state');
        ctx.cookies.set('oidc_nonce');
        return { status: 'ok' };
    }
}
