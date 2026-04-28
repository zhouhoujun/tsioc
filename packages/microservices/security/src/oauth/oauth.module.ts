import { Module } from '@tsdi/ioc';
import { JWTModule } from '../jwt';
import { OAuthOption } from './oauth.options';
import { OAuthCallback } from './oauth.callback';
import { OAuthInterceptor } from './oauth.interceptor';

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

    static withOption(options: OAuthOption) {
        return provideOAuthModule(options)
    }

}

export function provideOAuthModule(options: OAuthOption) {
    return {
        module: OAuthModule,
        providers: [
            { provide: OAuthOption, useValue: options }
        ]
    }
}

