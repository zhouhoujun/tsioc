import { ProvdierOf } from '@tsdi/ioc';
import { TypeormOptions } from '@tsdi/typeorm-adapter';
import { DataSourceOptions } from 'typeorm';

/**
 * Token signing options used by the local authentication service.
 * 本地认证服务使用的 token 签名选项。
 *
 * The values are shared by the access token, refresh token and the browser
 * session token so that downstream services can verify any of them with the
 * same secret/issuer pair.
 */
export interface OIDCJwtOptions {
    /**
     * HMAC secret. Falls back to `OIDC_SESSION_SECRET`, `JWT_SECRET`.
     */
    secret?: string;
    /**
     * Token issuer. Falls back to `OIDC_SESSION_ISSUER`, then the OIDC issuer.
     */
    issuer?: string;
    /**
     * Access token lifetime. Default `1h`.
     */
    accessExpiresIn?: string | number;
    /**
     * Refresh token lifetime. Default `7d`.
     */
    refreshExpiresIn?: string | number;
    /**
     * Session token lifetime. Default `24h`.
     */
    sessionExpiresIn?: string | number;
    /**
     * HMAC algorithm. Default `HS256`.
     */
    algorithm?: 'HS256' | 'HS384' | 'HS512';
}

/**
 * OIDC auth module options.
 * 可显式传入，也可通过环境变量提供。
 */
export interface OIDCAuthModuleOptions {
    clientId?: string;
    clientSecret?: string;
    authorizationURL?: string;
    tokenURL?: string;
    profileURL?: string;
    callbackURL?: string;
    issuer?: string;
    jwksURI?: string;
    scope?: string[];
    sessionExpiresIn?: string;
    sessionIssuer?: string;
    prompt?: string;
    loginHint?: string;
    /**
     * Allow the local `POST /auth/register` endpoint. Default false.
     * 是否允许本地注册，默认关闭。
     */
    allowRegistration?: boolean;
    /**
     * Local token signing configuration.
     */
    jwt?: OIDCJwtOptions;
}

/**
 * TypeORM persistence options for the auth service.
 */
export interface OIDCPersistenceOptions {
    /**
     * TypeORM connection options. `AuthUserEntity` is appended automatically
     * when a plain options object is supplied.
     */
    connection: ProvdierOf<TypeormOptions | DataSourceOptions>;
    /**
     * OIDC client configuration used by the same module.
     */
    auth?: OIDCAuthModuleOptions;
    /**
     * Allow local registration. Overrides `auth.allowRegistration`.
     */
    allowRegistration?: boolean;
}
