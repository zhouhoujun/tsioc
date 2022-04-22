import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { Http } from './clinet';
import { HttpServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        HttpServer,
        Http
    ]
})
export class HttpModule {

}


