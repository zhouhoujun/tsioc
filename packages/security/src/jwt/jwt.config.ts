import * as jwt from 'jsonwebtoken';

export class JWTOption {
    constructor(
        readonly secret: jwt.Secret | jwt.PublicKey,
        readonly tokenIn: 'header' | 'query' | 'body' = 'header',
        readonly tokenName: string = 'authentication',
        readonly options?: jwt.VerifyOptions) { }
}
