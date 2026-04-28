import { Module } from '@tsdi/ioc';
import { BasicAuthInterceptor } from './basic.interceptor';
import { BasicAuthOptions } from './basic.config';

@Module({
    providers: [
        BasicAuthInterceptor,
        // BasicAuthOptions
    ]
})
export class BasicAuthModule {

}

export function provideBasicAuthModule(options: BasicAuthOptions) {
    return {
        module: BasicAuthModule,
        providers: [
            { provide: BasicAuthOptions, useValue: options }
        ]
    }
}

