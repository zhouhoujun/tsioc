import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from '../mime';
import { Http } from './clinet';
import { HttpExecptionFilter, HTTP_EXECPTION_FILTERS } from './filter';
import { ArgumentErrorFilter, HttpFinalizeFilter } from './finalize-filter';
import { CatchInterceptor } from './interceptors/catch';
import { LogInterceptor } from './interceptors/log';
import { ResponsedInterceptor } from './interceptors/respond';
import { HttpServer, HttpServerOptions, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: HTTP_EXECPTION_FILTERS, useClass: HttpFinalizeFilter, multi: true },
        { provide: HTTP_EXECPTION_FILTERS, useClass: ArgumentErrorFilter, multi: true },
        { provide: MimeDb, useClass: BasicMimeDb, asDefault: true },

        { provide: HTTP_SERV_INTERCEPTORS, useClass: LogInterceptor, multi: true },
        { provide: HTTP_SERV_INTERCEPTORS, useClass: CatchInterceptor, multi: true },
        { provide: HTTP_SERV_INTERCEPTORS, useClass: ResponsedInterceptor, multi: true },
        HttpExecptionFilter,
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
