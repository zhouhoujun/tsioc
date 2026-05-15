export class OAuth2Options {
    constructor(
        readonly clientId: string,
        readonly clientSecret: string,
        readonly authorizationURL: string,
        readonly tokenURL: string,
        readonly profileURL: string,
        readonly callbackURL: string,
        readonly scope?: string[],
        readonly state?: string,
        readonly nonce?: string,
        readonly prompt?: string,
        readonly loginHint?: string
    ) { }
}
