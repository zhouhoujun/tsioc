import { Injectable } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OAuth2Service {
    private clients: Map<string, OAuth2Client> = new Map();
    private authCodes: Map<string, AuthorizationCode> = new Map();
    private tokens: Map<string, OAuth2Token> = new Map();
    
    private readonly JWT_SECRET = 'your-secret-key';

    constructor(
        private uuidGenerator: UuidGenerator    
    ) {
        // 注册示例客户端
        this.registerClient({
            clientId: 'example-client',
            clientSecret: 'example-secret',
            redirectUris: ['http://localhost:3000/callback'],
            grants: ['authorization_code', 'refresh_token']
        });
    }

    registerClient(client: OAuth2Client) {
        this.clients.set(client.clientId, client);
    }

    async generateAuthorizationCode(
        clientId: string,
        redirectUri: string,
        userId?: string,
        scope?: string[]
    ): Promise<string> {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error('Invalid client');
        }

        if (!client.redirectUris.includes(redirectUri)) {
            throw new Error('Invalid redirect URI');
        }

        const code = this.uuidGenerator.generate();
        const authCode: AuthorizationCode = {
            code,
            clientId,
            redirectUri,
            userId,
            scope,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        };

        this.authCodes.set(code, authCode);
        return code;
    }

    async generateToken(
        clientId: string,
        clientSecret: string,
        code: string,
        redirectUri: string
    ): Promise<OAuth2Token> {
        const client = this.clients.get(clientId);
        if (!client || client.clientSecret !== clientSecret) {
            throw new Error('Invalid client credentials');
        }

        const authCode = this.authCodes.get(code);
        if (!authCode || authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
            throw new Error('Invalid authorization code');
        }

        if (authCode.expiresAt < new Date()) {
            throw new Error('Authorization code expired');
        }

        // 删除使用过的授权码
        this.authCodes.delete(code);

        const token: OAuth2Token = {
            accessToken: jwt.sign(
                { 
                    clientId,
                    userId: authCode.userId,
                    scope: authCode.scope
                },
                this.JWT_SECRET,
                { expiresIn: '1h' }
            ),
            refreshToken: this.uuidGenerator.generate(),
            clientId,
            userId: authCode.userId,
            scope: authCode.scope,
            expiresIn: 3600 // 1 hour
        };

        this.tokens.set(token.accessToken, token);
        return token;
    }

    async refreshToken(
        clientId: string,
        clientSecret: string,
        refreshToken: string
    ): Promise<OAuth2Token> {
        const client = this.clients.get(clientId);
        if (!client || client.clientSecret !== clientSecret) {
            throw new Error('Invalid client credentials');
        }

        const oldToken = Array.from(this.tokens.values()).find(t => 
            t.refreshToken === refreshToken && t.clientId === clientId
        );

        if (!oldToken) {
            throw new Error('Invalid refresh token');
        }

        // 生成新的token
        const newToken: OAuth2Token = {
            accessToken: jwt.sign(
                { 
                    clientId,
                    userId: oldToken.userId,
                    scope: oldToken.scope
                },
                this.JWT_SECRET,
                { expiresIn: '1h' }
            ),
            refreshToken: this.uuidGenerator.generate(),
            clientId,
            userId: oldToken.userId,
            scope: oldToken.scope,
            expiresIn: 3600
        };

        // 删除旧token
        this.tokens.delete(oldToken.accessToken);
        this.tokens.set(newToken.accessToken, newToken);

        return newToken;
    }

    async validateToken(accessToken: string): Promise<boolean> {
        try {
            jwt.verify(accessToken, this.JWT_SECRET);
            return true;
        } catch {
            return false;
        }
    }
}

export interface OAuth2Client {
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    grants: string[];
}

export interface OAuth2Token {
    accessToken: string;
    refreshToken: string;
    clientId: string;
    userId?: string;
    scope?: string[];
    expiresIn: number;
}

export interface AuthorizationCode {
    code: string;
    clientId: string;
    redirectUri: string;
    userId?: string;
    scope?: string[];
    expiresAt: Date;
} 