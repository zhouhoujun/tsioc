import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { HttpModule, HttpServer } from '@tsdi/transport-http';
import { HttpClientModule } from '@tsdi/common';
import { ServerHttpClientModule } from '@tsdi/platform-server-common';
import { TransactionModule } from '@tsdi/repository';
import { LoggerModule } from '@tsdi/logs';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { TypeormModule, TypeormOptions } from '../src';
import { Role, User } from './models/models';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';
import { UserRepository } from './repositories/UserRepository';



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
        HttpModule.withOption({
            serverOpts: {
                majorVersion: 1
            }
        }),
        HttpClientModule,
        ServerHttpClientModule,
        TypeormModule.withConnection({
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
        HttpModule.withOption({
            serverOpts: {
                majorVersion: 1
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
        HttpModule.withOption({
            serverOpts: {
                majorVersion: 1
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
    ],
    bootstrap: HttpServer
})
export class MockTransBootTest {

}

@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        HttpModule.withOption({
            clientOpts: {
                authority: 'https://localhost:3000',
                options: {
                    ca: cert
                }
            },
            serverOpts: {
                majorVersion: 2,
                serverOpts: {
                    key,
                    cert
                }
            }
        }),
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
    ],
    bootstrap: HttpServer
})
export class Http2TransBootTest {

}

