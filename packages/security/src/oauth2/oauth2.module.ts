import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { JWT_MODULE_PROVIDERS, JWTModule } from '../jwt';
import { OAuth2Options } from './oauth2.options';
// import { OAuth2Callback } from './oauth2.callback';
import { OAuth2Interceptor } from './oauth2.interceptor';
import { OAuth2Service } from './oauth2.service';

export const OAUTH2_MODULE_PROVIDERS: Provider[] = [
    ...JWT_MODULE_PROVIDERS,
    OAuth2Interceptor,
    OAuth2Service,
];

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
    static withOption(options: OAuth2Options): ModuleWithProviders<OAuth2Module> {
        return {
            module: OAuth2Module,
            providers: createOAuth2Providers(options)
        };
    }
}

function createOAuth2Providers(options: OAuth2Options): Provider[] {
    return [
        { provide: OAuth2Options, useValue: options }
    ]
}

export function provideOAuth2(options: OAuth2Options): Provider[] {
    return [
        ...OAUTH2_MODULE_PROVIDERS,
        ...createOAuth2Providers(options)
    ];
}
