import { Module } from '@tsdi/ioc';
import { JwtInterceptor } from './jwt.interceptor';
import { JWTOption } from './jwt.config';
import { JWTService } from './jwt.service';

@Module({
    providers: [
        JwtInterceptor,
        JWTService,
        JWTOption
    ]   
})
export class JWTModule {

    static withOption(options: JWTOption) {
        return provideJWTModule(options)
    }
}

export function provideJWTModule(options: JWTOption) {
    return {
        module: JWTModule,
        providers: [{ provide: JWTOption, useValue: options }]
    };
}