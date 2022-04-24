import { Module, RouterModule, TransformModule, TransportContextFactory } from '@tsdi/core';
import { Http } from './clinet';
import { HttpContextFactory } from './context';
import { HttpServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: TransportContextFactory, useClass: HttpContextFactory },
        HttpServer,
        Http
    ]
})
export class HttpModule {

}


