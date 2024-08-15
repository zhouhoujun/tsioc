import { Module } from '@tsdi/ioc';
import { Http } from './client/clinet';
import { HttpServer } from './server/server';
import { HttpContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpClientCodingsHandlers } from './client/codings.hanlders';
import { HttpCodingsHandlers } from './server/codings.handlers';
import { HttpConfiguration } from './configuration';


@Module({
    providers: [
        Http,
        HttpServer,
        HttpStatusAdapter,
        HttpResponseEventFactory,
        HttpClientCodingsHandlers,
        HttpCodingsHandlers,
        HttpContextFactory,
        HttpConfiguration
    ]
})
export class HttpModule {

}
