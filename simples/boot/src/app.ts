import { LoggerModule, Module } from '@tsdi/core';
import { ServerModule } from '@tsdi/platform-server';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule } from '@tsdi/transport-http';
import { TransactionModule } from '@tsdi/repository';

// default load controllers form folder './controllers'
@Module({
    // baseURL: __dirname,
    imports: [
        LoggerModule,
        ServerModule,
        HttpModule,
        TransactionModule,
        TypeOrmModule
    ]
})
export class MockTransBootTest {

}

