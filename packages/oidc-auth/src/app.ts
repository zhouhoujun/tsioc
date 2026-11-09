import { Module } from '@tsdi/ioc';
import { useHttpTransport } from '@tsdi/http';
import { provideService, useCookie, useRouter } from '@tsdi/service';
import { TypeormOptions } from '@tsdi/typeorm-adapter';
import { OIDCModule, OIDCAuthModuleOptions } from './auth/OIDCModule';
import { AuthController } from './controllers/AuthController';
import { AuthUserEntity } from './models/AuthUser';

function databaseOptions(): TypeormOptions {
    const type = (process.env.OIDC_DB_TYPE || 'sqljs') as string;
    const common: TypeormOptions = {
        name: 'oidc-auth',
        type,
        synchronize: process.env.OIDC_DB_SYNC !== 'false',
        logging: process.env.OIDC_DB_LOGGING === 'true',
        entities: [AuthUserEntity]
    } as TypeormOptions;

    if (type === 'sqljs') {
        return {
            ...common,
            location: process.env.OIDC_DB_LOCATION || 'oidc-auth.sqlite',
            autoSave: true
        } as TypeormOptions;
    }

    return {
        ...common,
        host: process.env.OIDC_DB_HOST || 'localhost',
        port: parseInt(process.env.OIDC_DB_PORT || '5432', 10),
        username: process.env.OIDC_DB_USERNAME || 'postgres',
        password: process.env.OIDC_DB_PASSWORD || 'postgres',
        database: process.env.OIDC_DB_NAME || 'oidc_auth'
    } as TypeormOptions;
}

function authOptions(): OIDCAuthModuleOptions {
    return {
        clientId: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        authorizationURL: process.env.OIDC_AUTHORIZATION_URL,
        tokenURL: process.env.OIDC_TOKEN_URL,
        profileURL: process.env.OIDC_PROFILE_URL,
        callbackURL: process.env.OIDC_CALLBACK_URL,
        issuer: process.env.OIDC_ISSUER,
        jwksURI: process.env.OIDC_JWKS_URI,
        scope: ['openid', 'profile', 'email'],
        allowRegistration: process.env.OIDC_ALLOW_REGISTRATION === 'true',
        jwt: {
            secret: process.env.OIDC_SESSION_SECRET || process.env.JWT_SECRET,
            issuer: process.env.OIDC_SESSION_ISSUER,
            accessExpiresIn: process.env.OIDC_ACCESS_TOKEN_EXPIRES_IN,
            refreshExpiresIn: process.env.OIDC_REFRESH_TOKEN_EXPIRES_IN,
            sessionExpiresIn: process.env.OIDC_SESSION_EXPIRES_IN
        }
    };
}

@Module({
    imports: [
        OIDCModule.withPersistence({
            connection: databaseOptions(),
            auth: authOptions(),
            allowRegistration: process.env.OIDC_ALLOW_REGISTRATION === 'true'
        })
    ],
    declarations: [
        AuthController
    ],
    providers: [
        provideService(
            useRouter(),
            useCookie(),
            useHttpTransport({
                listenOpts: {
                    host: process.env.OIDC_HOST || '0.0.0.0',
                    port: parseInt(process.env.OIDC_PORT || '3000', 10)
                },
                static: false,
                asDefault: true,
            })
        )
    ]
})
export class AppModule {}
