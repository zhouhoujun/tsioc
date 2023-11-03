import { Module } from '@tsdi/ioc';
import { LoggerModule, LogConfigure } from '@tsdi/logger';
import { EndpointsModule } from '@tsdi/endpoints';
import { AssetTransportModule, Bodyparser, Content, Cors, Json } from '@tsdi/endpoints/assets';
import { HttpModule } from '@tsdi/http';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLog4Module } from '@tsdi/platform-server/log4js';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints'
import { SwaggerModule } from '@tsdi/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { User } from './models/User';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';
import { UserRepository } from './repositories/UserRepository';
import { Role } from './models/Role';



const connections = {
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
    entities: [
        //load by source.
        // './models/**/*.ts', './models/**/*.js'
        User,
        Role
    ],
    repositories: [
        // './repositories/**/*.ts'
        UserRepository
    ],
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
} as ConnectionOptions;

const logconfig = {
    // adapter: 'console',
    // config: {
    //     level: 'trace'
    // },
    adapter: 'log4js',
    config: {
        appenders: <any>{
            core: {
                type: 'dateFile',
                pattern: '-yyyyMMdd.log',
                filename: './log/core',
                backups: 3,
                alwaysIncludePattern: true,
                category: 'core'
            },
            console: { type: 'console' }
        },
        categories: {
            default: {
                appenders: ['core', 'console'],
                level: 'debug'
            },
            core: {
                appenders: ['core', 'console'],
                level: 'debug'
            }
        },
        pm2: true
    }
} as LogConfigure;


// openssl req -x509 -days 3650 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem

const key = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-cert.pem'));


@Module({
    baseURL: __dirname,
    imports: [
        LoggerModule.withOptions(logconfig),
        ServerModule,
        ServerLog4Module,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        TransactionModule,
        TypeOrmModule.withConnection(connections),
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 2,
                serverOpts: {
                    cert,
                    key
                },
                interceptors: [
                    Cors,
                    Content,
                    Json,
                    Bodyparser,
                ]
            }
        }),
        SwaggerModule.withOptions({
            title: 'api document',
            description: 'platform basic api',
            version: 'v1',
            prefix: 'api-doc'
        })
    ],
    declarations: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}
