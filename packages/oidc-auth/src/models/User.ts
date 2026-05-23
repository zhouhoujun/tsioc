export interface UserProfile {
    sub: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;

    oidcId?: string;
    oidcProvider?: string;
    oidcProfile?: Record<string, unknown>;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserSession {
    sub: string;
    name?: string;
    email?: string;
    emailVerified?: boolean;
    picture?: string;
    provider: string;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: Date;
}
