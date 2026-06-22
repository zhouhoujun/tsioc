import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { JWT_MODULE_PROVIDERS, JWTModule } from '../jwt';
import { OAuthOption } from './oauth.options';
import { OAuthCallback } from './oauth.callback';
import { OAuthInterceptor } from './oauth.interceptor';

export const OAUTH_MODULE_PROVIDERS: Provider[] = [
    ...JWT_MODULE_PROVIDERS,
    OAuthInterceptor,
    OAuthCallback
];

@Module({
    imports: [
        JWTModule
    ],
    providers: [
        OAuthInterceptor,
        OAuthCallback
    ]
})
export class OAuthModule {

    static withOption(options: OAuthOption): ModuleWithProviders<OAuthModule> {
        return {
            module: OAuthModule,
            providers: createOAuthProviders(options)
        };
    }

}

function createOAuthProviders(options: OAuthOption): Provider[] {
    return [
        { provide: OAuthOption, useValue: options }
    ]
}

export function provideOAuth(options: OAuthOption): Provider[] {
    return [
        ...OAUTH_MODULE_PROVIDERS,
        ...createOAuthProviders(options)
    ];
}
