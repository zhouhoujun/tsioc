import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { JWTModule } from '../jwt/jwt.module';
import { OAUTH2_MODULE_PROVIDERS, OAuth2Module } from '../oauth2/oauth2.module';
import { OIDCInterceptor } from './oidc.interceptor';
import { OIDCService } from './oidc.service';
import { OIDCOptions } from './oidc.options';

export const OIDC_MODULE_PROVIDERS: Provider[] = [
    ...OAUTH2_MODULE_PROVIDERS,
    OIDCInterceptor,
    OIDCService
];

@Module({
    imports: [
        JWTModule,
        OAuth2Module
    ],
    providers: [
        OIDCInterceptor,
        OIDCService
    ]
})
export class OIDCModule {
    static withOption(options: OIDCOptions): ModuleWithProviders<OIDCModule> {
        return {
            module: OIDCModule,
            providers: createOIDCProviders(options)
        };
    }
}

/**
 * provide oidc auth with options.
 * @param options 
 * @example
 * ```ts
 *  const oidcOptions = new OIDCOptions(
 *    'client_id',
 *    'client_secret',
 *    'https://oidc-provider.com/auth',
 *    'https://oidc-provider.com/token',
 *    'https://your-app.com/callback',
 *    'https://oidc-provider.com',
 *    'https://oidc-provider.com/jwks'
 *  );
 *   provideOIDC(oidcOptions
 * ```
 * @returns 
 */
function createOIDCProviders(options: OIDCOptions): Provider[] {
    return [
        { provide: OIDCOptions, useValue: options }
    ];
}

export function provideOIDC(options: OIDCOptions): Provider[] {
    return [
        ...OIDC_MODULE_PROVIDERS,
        ...createOIDCProviders(options)
    ];
}
