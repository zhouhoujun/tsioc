import { LoggerModule, Module, TransactionModule } from '@tsdi/core';
import { ServerModule } from '@tsdi/platform-server';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule } from '@tsdi/transport';
import { UserController } from './controllers/UserController';
import { RoleController } from './controllers/RoleController';


@Module({
    // baseURL: __dirname,
    imports: [
        LoggerModule,
        ServerModule,
        HttpModule,
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

