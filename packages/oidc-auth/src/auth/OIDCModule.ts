import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { OIDCModule as SharedOIDCModule, OIDCOptions, OAuth2Module, JWTModule, provideOIDC as provideSecurityOIDC } from '@tsdi/security';
import { OIDCService } from './OIDCService';

export interface OIDCAuthModuleOptions {
    clientId: string;
    clientSecret: string;
    authorizationURL: string;
    tokenURL: string;
    profileURL: string;
    callbackURL: string;
    issuer: string;
    jwksURI?: string;
    scope?: string[];
    sessionExpiresIn?: string;
    sessionIssuer?: string;
    prompt?: string;
    loginHint?: string;
}

@Module({
    imports: [
        JWTModule,
        OAuth2Module,
        SharedOIDCModule
    ],
    providers: [
        OIDCService
    ],
    exports: [
        OIDCService
    ]
})
export class OIDCModule {
    static withOptions(options: OIDCAuthModuleOptions): ModuleWithProviders<OIDCModule> {
        return {
            module: OIDCModule,
            providers: createOIDCAuthOptionProviders(options)
        };
    }
}

function createSecurityOIDCOptions(options: OIDCAuthModuleOptions): OIDCOptions {
    return new OIDCOptions(
        options.clientId,
        options.clientSecret,
        options.authorizationURL,
        options.tokenURL,
        options.profileURL,
        options.callbackURL,
        options.issuer,
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
            provide: 'OIDC_AUTH_MODULE_OPTIONS',
            useValue: options
        }
    ];
}

export function provideOIDC(options: OIDCAuthModuleOptions): Provider[] {
    return [
        ...provideSecurityOIDC(createSecurityOIDCOptions(options)),
        OIDCService,
        ...createOIDCAuthOptionProviders(options)
    ];
}
