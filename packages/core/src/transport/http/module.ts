import { Module } from '../../metadata/decor';
import { HttpInterceptingHandler } from './interceptor';
import { TransformModule } from '../../pipes/module';
import { MiddlewareModule } from '../middlewares';
import { HttpClient } from './client';
import { HttpHandler } from './handler';
import { HttpServer } from './server';


@Module({
    providers: [
        HttpClient,
        { provide: HttpHandler, useClass: HttpInterceptingHandler }
    ]
})
export class HttpClientModule {

}


@Module({
    imports: [
        TransformModule,
        MiddlewareModule,
        HttpClientModule
    ],
    providers: [
        HttpServer
    ]
})
export class HttpModule {

}
