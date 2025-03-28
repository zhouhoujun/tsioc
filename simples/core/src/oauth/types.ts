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