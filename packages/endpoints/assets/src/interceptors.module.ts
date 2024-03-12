import { Module } from '@tsdi/ioc';
import {
    Bodyparser,
    Cors, Csrf, HelmetMiddleware
} from './interceptors';


@Module({
    providers: [
        Bodyparser,

        Cors,
        Csrf,
        HelmetMiddleware
    ]
})
export class InterceptorsModule {
    
}
