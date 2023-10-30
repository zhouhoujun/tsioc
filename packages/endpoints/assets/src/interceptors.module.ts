import { Module } from '@tsdi/ioc';
import {
    Bodyparser, Content, Json,
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware
} from './interceptors';


@Module({
    providers: [
        Bodyparser,
        Content,
        Json,

        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware
    ]
})
export class InterceptorsModule {
    
}
