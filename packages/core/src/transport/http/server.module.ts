
import { Module } from '../../metadata/decor';
import { TransformModule } from '../../pipes/module';
import { RouterModule } from '../../router';
import { HttpServer } from './server';

/**
 * http server module.
 */
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
