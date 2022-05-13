import { Module, ConnectionOptions, TransactionModule, LoggerModule } from '@tsdi/core';
import { HttpModule, HttpServer } from '@tsdi/transport';
import { Connection } from 'typeorm';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerLogsModule, ServerModule } from '@tsdi/platform-server';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

const key = fs.readFileSync(path.join(__dirname, './localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, './localhost-cert.pem'));

@Module({
    baseURL: __dirname,
    imports: [
        LoggerModule.withOptions({
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
                        level: 'info'
                    },
                    core: {
                        appenders: ['core', 'console'],
                        level: 'info'
                    }
                },
                pm2: true
            }
        }),
        ServerModule,
        ServerLogsModule,
        TransactionModule,
        TypeOrmModule.withConnection(connections),
        HttpModule.withOption({
            majorVersion: 2,
            cors: true,
            options: {
                cert,
                key
            }
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

