import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from '../mime';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpServerOptions, HTTP_SERVEROPTIONS } from './server/options';

/**
 * http module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: MimeDb, useClass: BasicMimeDb, asDefault: true },
        HttpServer,
        Http
    ]
})
export class HttpModule {

    static withOption(option: HttpServerOptions): ModuleWithProviders<HttpModule> {
        const providers: ProviderType[] = [{ provide: HTTP_SERVEROPTIONS, useValue: option }];
        return {
            module: HttpModule,
            providers
        }
    }
}
