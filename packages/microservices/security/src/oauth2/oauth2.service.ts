import { Injectable } from '@tsdi/ioc';
import { AbstractRequestContext } from '@tsdi/endpoints';
import { OAuth2Options } from './oauth2.options';
import { fetch } from 'cross-fetch';
import { URLSearchParams } from 'url';

@Injectable()
export class OAuth2Service {
    async handleCallback(ctx: AbstractRequestContext, options: OAuth2Options): Promise<any> {
        const code = ctx.query.code;
        if (!code) {
            throw new Error('Authorization code not found');
        }

        const tokenResponse = await this.exchangeAuthorizationCode(code, options);
        if (!tokenResponse.access_token) {
            throw new Error('Invalid token response');
        }

        return this.fetchUserInfo(tokenResponse.access_token, options);
    }

    async exchangeAuthorizationCode(code: string, options: OAuth2Options): Promise<any> {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', options.callbackURL);
        params.append('client_id', options.clientId);
        params.append('client_secret', options.clientSecret);

        const response = await fetch(options.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`Token request failed: ${response.statusText}`);
        }

        return response.json();
    }

    async fetchUserInfo(accessToken: string, options: OAuth2Options): Promise<any> {
        const response = await fetch(options.profileURL || `${options.tokenURL}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`User info request failed: ${response.statusText}`);
        }

        return response.json();
    }

    buildAuthorizationUrl(options: OAuth2Options, state?: string): string {
        const url = new URL(options.authorizationURL);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('client_id', options.clientId);
        url.searchParams.append('redirect_uri', options.callbackURL);
        if (options.scope?.length) {
            url.searchParams.append('scope', options.scope.join(' '));
        }
        const authState = state ?? options.state;
        if (authState) {
            url.searchParams.append('state', authState);
        }
        if (options.nonce) {
            url.searchParams.append('nonce', options.nonce);
        }
        if (options.prompt) {
            url.searchParams.append('prompt', options.prompt);
        }
        if (options.loginHint) {
            url.searchParams.append('login_hint', options.loginHint);
        }
        return url.toString();
    }
} 