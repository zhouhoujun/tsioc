import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { TransactionModule } from '@tsdi/repository';
import { HttpServerModule } from '@tsdi/transport-http';
import { TypeormModule } from '@tsdi/typeorm-adapter';

@Module({
    exports: [
        ServerModule,
        LoggerModule,
        HttpServerModule,
        TransactionModule,
        TypeormModule
    ]
})
export class MvcModule {

}