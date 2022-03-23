import { Module, ConnectionOptions, TransactionModule } from '@tsdi/core';
import { LogModule } from '@tsdi/logs';
import { ServerBootstrapModule } from '@tsdi/platform-server';
import { Connection } from 'typeorm';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { Role, User } from './models/models';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';
import { UserRepository } from './repositories/UserRepository';



export const connections = {
    async initDb(connection: Connection) {
        let userRep = connection.getRepository(User);
        let c = await userRep.count();
        if (c < 1) {
            let newUr = new User();
            newUr.name = 'admin';
            newUr.account = 'admin';
            newUr.password = '111111';
            await userRep.save(newUr);
        }
    },
    name: 'xx',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'testdb',
    entities: [
        User,
        Role
    ],
    repositories: [
        UserRepository
    ],
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
} as ConnectionOptions;


@Module({
    // baseURL: __dirname,
    imports: [
        LogModule,
        ServerBootstrapModule,
        TransactionModule,
        TypeOrmModule.withConnection(connections)
    ],
    providers: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}

