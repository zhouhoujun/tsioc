import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logs';
import { ServerModule } from '@tsdi/platform-server';
import { TransactionModule } from '@tsdi/repository';
import { HttpModule } from '@tsdi/transport-http';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';

@Module({
    exports: [
        ServerModule,
        LoggerModule,
        HttpModule,
        TransactionModule,
        TypeOrmModule
    ]
})
export class MvcModule {

}