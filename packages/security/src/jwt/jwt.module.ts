import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { JwtInterceptor } from './jwt.interceptor';
import { JWTOption } from './jwt.config';
import { JWTService } from './jwt.service';

export const JWT_MODULE_PROVIDERS: Provider[] = [
    JwtInterceptor,
    JWTService,
    JWTOption
];

@Module({
    providers: JWT_MODULE_PROVIDERS
})
export class JWTModule {

    static withOption(options: JWTOption): ModuleWithProviders<JWTModule> {
        return {
            module: JWTModule,
            providers: createJWTProviders(options)
        };
    }
}

function createJWTProviders(options: JWTOption): Provider[] {
    return [{ provide: JWTOption, useValue: options }];
}

export function provideJWT(options: JWTOption): Provider[] {
    return [
        ...JWT_MODULE_PROVIDERS,
        ...createJWTProviders(options)
    ];
}
