import { Module } from '@tsdi/ioc';
import { JwtInterceptor } from './jwt.interceptor';
import { JWTOption } from './jwt.config';

@Module({
    providers: [
        JwtInterceptor,
        JWTOption
    ]   
})
export class JWTModule {

}

export function provideJWTModule(options: JWTOption) {
    return {
        module: JWTModule,
        providers: [{ provide: JWTOption, useValue: options }]
    };
}