import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { ClientModule } from '@tsdi/common/client';
import { HttpClientModule } from '@tsdi/common/http';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { BodyparserInterceptor, ContentInterceptor, EndpointModule, JsonInterceptor } from '@tsdi/endpoints';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { TransactionModule } from '@tsdi/repository';
import { LoggerModule } from '@tsdi/logger';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { TypeormModule, TypeormOptions } from '../src';
import { Role, User } from './models/models';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';
// import { UserRepository } from './repositories/UserRepository';



export const option = {
    entities: [],
    async initDb(connection: DataSource) {
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
} as TypeormOptions;


export const key = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-privkey.pem'));
export const cert = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-cert.pem'));


@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        HttpClientModule,
        ServerHttpClientModule,
        EndpointModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 1,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            }
        }),
        TypeormModule.withConnection({
            ...option,
            entities: [
                Role,
                User
            ],
            // repositories: [
            //     UserRepository
            // ]
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
        EndpointModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 1,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TransactionModule,
        TypeormModule.withConnection({
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
        EndpointModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 1,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TransactionModule,
        TypeormModule.withConnection({
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
export class MockTransBootTest {

}

@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        TransactionModule,
        TypeormModule.withConnection({
            ...option,
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        }),
        ClientModule.register({
            transport: 'http',
            clientOpts: {
                authority: 'https://localhost:3000',
                connectOpts: {
                    ca: cert
                }
            }
        }),
        EndpointModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 2,
                secure: true,
                serverOpts: {
                    key,
                    cert
                },
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            }
        })
    ],
    declarations: [
        UserController,
        RoleController
    ]
})
export class Http2TransBootTest {

}

