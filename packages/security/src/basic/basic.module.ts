import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BasicAuthInterceptor } from './basic.interceptor';
import { BasicAuthOptions } from './basic.config';

export const BASIC_AUTH_PROVIDERS: Provider[] = [
    BasicAuthInterceptor,
];

@Module({
    providers: BASIC_AUTH_PROVIDERS
})
export class BasicAuthModule {
    static withOption(options: BasicAuthOptions): ModuleWithProviders<BasicAuthModule> {
        return {
            module: BasicAuthModule,
            providers: createBasicAuthProviders(options)
        };
    }
}

function createBasicAuthProviders(options: BasicAuthOptions): Provider[] {
    return [
        { provide: BasicAuthOptions, useValue: options }
    ]
}

export function provideBasicAuth(options: BasicAuthOptions): Provider[] {
    return [
        ...BASIC_AUTH_PROVIDERS,
        ...createBasicAuthProviders(options)
    ];
}
