import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logs';
import { HttpModule, HttpServer } from '@tsdi/transport-http';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerLogsModule, ServerModule } from '@tsdi/platform-server';
import * as fs from 'fs';
import * as path from 'path';
import { User } from './models/User';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';
import { UserRepository } from './repositories/UserRepository';
import { LogConfigure } from '@tsdi/logs';
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
        ServerLogsModule,
        TransactionModule,
        TypeOrmModule.withConnection(connections),
        HttpModule.withOption({
            serverOpts: {
                majorVersion: 2,
                cors: true,
                serverOpts: {
                    cert,
                    key
                }
            }
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
