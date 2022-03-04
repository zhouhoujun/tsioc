
import { Module } from '../../metadata/decor';
import { TransformModule } from '../../pipes/module';
import { RouterModule } from '../../router';
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
export class HttpServerModule {

}
