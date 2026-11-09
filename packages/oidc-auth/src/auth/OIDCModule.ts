import { isPlainObject, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import {
    OIDCModule as SharedOIDCModule,
    OIDCOptions,
    OAuth2Module,
    JWTModule,
    provideOIDC as provideSecurityOIDC
} from '@tsdi/security';
import { TypeOrmModule, TypeormOptions } from '@tsdi/typeorm-adapter';
import { ServerModule } from '@tsdi/platform-server';
import { DataSourceOptions } from 'typeorm';
import { OIDCService, OIDC_AUTH_MODULE_OPTIONS } from './OIDCService';
import { OIDCAuthGuard } from './OIDCAuthGuard';
import { InMemoryUserStore, UserStore } from './UserStore';
import { TypeOrmUserStore } from './TypeOrmUserStore';
import { AuthUserEntity } from '../models/AuthUser';
import { OIDCAuthModuleOptions, OIDCPersistenceOptions } from './options';

export type { OIDCAuthModuleOptions, OIDCJwtOptions, OIDCPersistenceOptions } from './options';

@Module({
    imports: [
        JWTModule,
        OAuth2Module,
        SharedOIDCModule,
        ServerModule,
        TypeOrmModule
    ],
    providers: [
        OIDCService,
        InMemoryUserStore,
        { provide: UserStore, useExisting: InMemoryUserStore, asDefault: true },
        OIDCAuthGuard
    ],
    exports: [
        OIDCService,
        OIDCAuthGuard,
        UserStore
    ]
})
export class OIDCModule {
    static withOptions(options: OIDCAuthModuleOptions): ModuleWithProviders<OIDCModule> {
        return {
            module: OIDCModule,
            providers: createOIDCAuthOptionProviders(options)
        };
    }

    /**
     * Enable TypeORM backed user storage for the auth service.
     *
     * ```ts
     * imports: [
     *   OIDCModule.withPersistence({
     *     connection: { type: 'sqljs', synchronize: true, entities: [AuthUserEntity] },
     *     auth: { clientId: '...', issuer: '...' }
     *   })
     * ]
     * ```
     */
    static withPersistence(options: OIDCPersistenceOptions): ModuleWithProviders<OIDCModule> {
        const connection = withAuthEntities(options.connection);
        const authOptions: OIDCAuthModuleOptions = {
            ...(options.auth ?? {})
        };
        if (options.allowRegistration !== undefined) {
            authOptions.allowRegistration = options.allowRegistration;
        }
        const providers: Provider[] = [
            ...TypeOrmModule.withConnection(connection).providers,
            TypeOrmUserStore,
            { provide: UserStore, useExisting: TypeOrmUserStore }
        ];
        if (options.auth || options.allowRegistration !== undefined) {
            providers.push({
                provide: OIDC_AUTH_MODULE_OPTIONS,
                useValue: authOptions
            });
        }
        return {
            module: OIDCModule,
            providers
        };
    }
}

function createSecurityOIDCOptions(options: OIDCAuthModuleOptions): OIDCOptions {
    return new OIDCOptions(
        options.clientId ?? '',
        options.clientSecret ?? '',
        options.authorizationURL ?? '',
        options.tokenURL ?? '',
        options.profileURL ?? '',
        options.callbackURL ?? '',
        options.issuer ?? '',
        options.jwksURI,
        options.scope,
        undefined,
        undefined,
        options.prompt,
        options.loginHint
    );
}

function createOIDCAuthOptionProviders(options: OIDCAuthModuleOptions): Provider[] {
    if (options.sessionExpiresIn) {
        process.env.OIDC_SESSION_EXPIRES_IN = options.sessionExpiresIn;
    }
    if (options.sessionIssuer) {
        process.env.OIDC_SESSION_ISSUER = options.sessionIssuer;
    }
    return [
        {
            provide: OIDC_AUTH_MODULE_OPTIONS,
            useValue: options
        }
    ];
}

function withAuthEntities(connection: OIDCPersistenceOptions['connection']): OIDCPersistenceOptions['connection'] {
    if (!isPlainObject(connection) || 'provide' in connection || 'useValue' in connection || 'useClass' in connection) {
        return connection;
    }
    const options = connection as TypeormOptions & DataSourceOptions;
    const entities = (options.entities ?? []).filter(entity => entity !== AuthUserEntity);
    return {
        ...options,
        entities: [...entities, AuthUserEntity]
    } as OIDCPersistenceOptions['connection'];
}

export function provideOIDC(options: OIDCAuthModuleOptions): Provider[] {
    return [
        ...provideSecurityOIDC(createSecurityOIDCOptions(options)),
        OIDCService,
        OIDCAuthGuard,
        InMemoryUserStore,
        { provide: UserStore, useExisting: InMemoryUserStore, asDefault: true },
        ...createOIDCAuthOptionProviders(options)
    ];
}
