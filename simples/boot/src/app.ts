import { Module, TransactionModule } from '@tsdi/core';
import { LogModule } from '@tsdi/logs';
import { ServerBootstrapModule } from '@tsdi/platform-server';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { UserController } from './controllers/UserController';
import { RoleController } from './controllers/RoleController';


@Module({
    // baseURL: __dirname,
    imports: [
        LogModule,
        ServerBootstrapModule,
        TransactionModule,
        TypeOrmModule
    ],
    providers: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}

