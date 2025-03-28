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
    /**
     * 提供模块配置选项
     * @param options  OAuth2配置参数
     * @returns 返回配置好的模块提供器
     */
    static withOption(options: OAuth2Options) {
        return provideOAuth2Module(options)
    }
}

export function provideOAuth2Module(options: OAuth2Options) {
    return {
        module: OAuth2Module,
        providers: [
            { provide: OAuth2Options, useValue: options }
        ]
    }
}

