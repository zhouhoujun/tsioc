import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { HttpClientModule } from '@tsdi/common/http';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { HttpModule, HttpServer, HttpServerModule } from '@tsdi/transport-http';
import { Connection } from 'typeorm';
import { Role, User } from './models/models';
import { UserController } from './controllers/UserController';
import { RoleController } from './controllers/RoleController';
import { UserRepository } from './repositories/UserRepository';
import { LoggerModule } from '@tsdi/logs';



export const option = {
    entities:[],
    async initDb(connection: Connection) {
        const userRep = connection.getRepository(User);
        const c = await userRep.count();
        if (c < 1) {
            const newUr = new User();
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
        ServerModule,
        LoggerModule,
        HttpServerModule.withOption({
            serverOpts: {
                majorVersion: 1
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [
                Role,
                User
            ],
            repositories: [
                UserRepository
            ]
        })
    ],
    declarations: [
        UserController,
        RoleController
    ],
    bootstrap: HttpServer
})
export class MockBootTest {

}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        HttpServerModule.withOption({
            serverOpts: {
                majorVersion: 1
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        })
    ],
    declarations: [
        UserController,
        RoleController
    ],
    bootstrap: HttpServer
})
export class MockBootLoadTest {

}



@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        HttpServerModule.withOption({
            serverOpts: {
                majorVersion: 1
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        })
    ],
    providers: [
        UserController,
        RoleController
    ],
    bootstrap: HttpServer
})
export class MockTransBootTest {

}

