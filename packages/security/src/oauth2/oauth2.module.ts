import { Module } from '@tsdi/ioc';
import { JWTModule } from '../jwt';
import { OAuth2Options } from './oauth2.options';
// import { OAuth2Callback } from './oauth2.callback';
import { OAuth2Interceptor } from './oauth2.interceptor';
import { OAuth2Service } from './oauth2.service';

@Module({
    imports: [
        JWTModule
    ],
    providers: [
        OAuth2Interceptor,
        OAuth2Service,
        // OAuth2Callback
    ]
})
export class OAuth2Module {

}

export function provideOAuth2Module(options: OAuth2Options) {
    return {
        module: OAuth2Module,
        providers: [
            { provide: OAuth2Options, useValue: options }
        ]
    }
}

