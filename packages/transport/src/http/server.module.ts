import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { HttpServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        HttpServer
    ]
})
export class HttpModule {

}

