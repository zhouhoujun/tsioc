import { Module } from '@tsdi/ioc';
import { Http } from './client/clinet';
import { HttpServer } from './server/server';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpConfiguration, HttpIncomingFactory } from './configuration';

@Module({
    providers: [
        Http,
        HttpServer,
        HttpResponseEventFactory,
        HttpIncomingFactory,
        HttpConfiguration

    ]
})
export class HttpModule {

}
