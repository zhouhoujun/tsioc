import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { TransactionModule } from '@tsdi/repository';
import { HttpModule } from '@tsdi/http';
import { TypeormModule } from '@tsdi/typeorm-adapter';

@Module({
    exports: [
        ServerModule,
        LoggerModule,
        HttpModule,
        TransactionModule,
        TypeormModule
    ]
})
export class MvcModule {

}