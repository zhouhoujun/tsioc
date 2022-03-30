import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { HttpClient } from './clinet';
import { HttpServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        HttpServer,
        HttpClient
    ]
})
export class HttpModule {

}


