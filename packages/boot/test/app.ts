import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { HttpClientModule } from '@tsdi/common/http';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { HttpModule } from '@tsdi/http';
import { Connection } from 'typeorm';
import { Role, User } from './models/models';
import { UserController } from './controllers/UserController';
import { RoleController } from './controllers/RoleController';
import { UserRepository } from './repositories/UserRepository';
import { EndpointsModule } from '@tsdi/endpoints';
import { AssetTransportModule, Bodyparser, Content, Json } from '@tsdi/endpoints/assets';



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
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        HttpClientModule,
        ServerHttpClientModule,
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                interceptors:[
                    Content,
                    Json,
                    Bodyparser
                ]
            }
        }),
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
    ]
})
export class MockBootTest {

}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        HttpClientModule,
        ServerHttpClientModule,
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                interceptors:[
                    Content,
                    Json,
                    Bodyparser
                ]
            }
        }),
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
    ]
})
export class MockBootLoadTest {

}



@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        HttpClientModule,
        ServerHttpClientModule,
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                interceptors:[
                    Content,
                    Json,
                    Bodyparser
                ]
            }
        }),
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
    ]
})
export class MockTransBootTest {

}

