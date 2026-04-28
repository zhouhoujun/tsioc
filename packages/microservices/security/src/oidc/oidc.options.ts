import { OAuth2Options } from '../oauth2/oauth2.options';

export class OIDCOptions extends OAuth2Options {
    constructor(
        clientId: string,
        clientSecret: string,
        authorizationURL: string,
        tokenURL: string,
        profileURL: string,
        callbackURL: string,
        readonly issuer: string,
        readonly jwksURI?: string,
        scope?: string[]
    ) {
        super(clientId, clientSecret, authorizationURL, tokenURL, profileURL, callbackURL, scope);
    }
}
