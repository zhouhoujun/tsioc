import { Module } from '@tsdi/ioc';
import { JWTModule } from '../jwt/jwt.module';
import { OAuth2Module } from '../oauth2/oauth2.module';
import { OIDCInterceptor } from './oidc.interceptor';
import { OIDCService } from './oidc.service';
import { OIDCOptions } from './oidc.options';

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
    static withOption(options: OIDCOptions) {
        return provideOIDCModule(options)
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
 *   provideOIDCModule(oidcOptions
 * ```
 * @returns 
 */
export function provideOIDCModule(options: OIDCOptions) {
    return {
        module: OIDCModule,
        providers: [
            { provide: OIDCOptions, useValue: options }
        ]
    };
}


