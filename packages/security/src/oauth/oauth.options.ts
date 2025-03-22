export class OAuthOption {
    constructor(
        readonly clientId: string,
        readonly clientSecret: string,
        readonly authorizationURL: string,
        readonly tokenURL: string,
        readonly callbackURL: string,
        readonly scope?: string[]
    ) { }
} 