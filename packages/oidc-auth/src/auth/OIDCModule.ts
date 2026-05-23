import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { OIDCModule as SharedOIDCModule, OAuth2Module, JWTModule } from '@tsdi/security';
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
    static withOptions(options: OIDCAuthModuleOptions): ModuleWithProviders {
        return provideOIDCModule(options);
    }
}

export function provideOIDCModule(options: OIDCAuthModuleOptions): ModuleWithProviders {
    if (options.sessionExpiresIn) {
        process.env.OIDC_SESSION_EXPIRES_IN = options.sessionExpiresIn;
    }
    if (options.sessionIssuer) {
        process.env.OIDC_SESSION_ISSUER = options.sessionIssuer;
    }
    return {
        module: OIDCModule,
        providers: [
            {
                provide: 'OIDC_AUTH_MODULE_OPTIONS',
                useValue: options
            }
        ]
    };
}
