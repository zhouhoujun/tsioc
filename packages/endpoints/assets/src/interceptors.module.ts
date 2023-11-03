import { Module } from '@tsdi/ioc';
import {
    Bodyparser, Content, Json,
    Cors, Csrf, HelmetMiddleware
} from './interceptors';


@Module({
    providers: [
        Bodyparser,
        Content,
        Json,

        Cors,
        Csrf,
        HelmetMiddleware
    ]
})
export class InterceptorsModule {
    
}
