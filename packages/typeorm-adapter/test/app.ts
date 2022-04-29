import { Module, ConnectionOptions, TransactionModule } from '@tsdi/core';
import { LogModule } from '@tsdi/logs';
import { ServerModule } from '@tsdi/platform-server';
import { Connection } from 'typeorm';
import { TypeOrmModule } from '../src';
import { Role, User } from './models/models';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';



export const option = {
    entities:[],
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
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
} as ConnectionOptions;



@Module({
    // baseURL: __dirname,
    imports: [
        LogModule,
        ServerModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [
                Role,
                User
            ]
        })
    ],
    declarations: [
        UserController,
        RoleController
    ]
})
export class MockBootTest {

}


@Module({
    baseURL: __dirname,
    imports: [
        LogModule,
        ServerModule,
        TypeOrmModule.withConnection({
            ...option,
            models: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        })
    ],
    declarations: [
        UserController,
        RoleController
    ]
})
export class MockBootLoadTest {

}



@Module({
    // baseURL: __dirname,
    imports: [
        LogModule,
        ServerModule,
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            models: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        })
    ],
    providers: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}

