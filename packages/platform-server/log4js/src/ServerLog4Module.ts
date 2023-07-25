import { Module } from '@tsdi/ioc';
import { ServerJoinpointLogFormater } from './ServerLog4Formater';
import { Log4jsAdapter } from './Log4jsAdapter';

@Module({
    providers: [
        ServerJoinpointLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLog4Module { }
