import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { HttpClientModule } from '@tsdi/common/http';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { withHttpTransport } from '@tsdi/http';
import { provideService, withServiceRouter } from '@tsdi/service';
import { TransactionModule } from '@tsdi/repository';
import { LoggerModule } from '@tsdi/logger';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { TypeOrmModule, TypeormOptions } from '../src';
import { Role, User } from './models/models';
import { UserController } from './mapping/UserController';
import { RoleController } from './mapping/RoleController';


export const option = {
    entities: [],
    async initDb(connection: DataSource) {
        try {
            if (!connection.hasMetadata(User)) return;
            const userRep = connection.getRepository(User);
            const c = await userRep.count();
            if (c < 1) {
                const newUr = new User();
                newUr.name = 'admin';
                newUr.account = 'admin';
                newUr.password = '111111';
                await userRep.save(newUr);
            }
        } catch { /* entities may not be loaded yet */ }
    },
    name: 'xx',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'testdb',
    synchronize: true,
    logging: false
} as TypeormOptions;


export const key = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-privkey.pem'));
export const cert = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-cert.pem'));


@Module({
    imports: [
        ServerModule,
        LoggerModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [
                Role,
                User
            ],
        })
    ]
})
export class MockBootTest {

}


@Module({
    imports: [
        ServerModule,
        LoggerModule,
        HttpClientModule,
        ServerHttpClientModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [
                Role,
                User
            ],
        })
    ],
    providers: [
        provideService(
            withServiceRouter(),
            ...withHttpTransport({ listenOpts: { port: 3000, host: '127.0.0.1' }, asDefault: true }),
        ),
    ],
    declarations: [UserController, RoleController],
})
export class MockBootHttpTest {

}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
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
        provideService(
            withServiceRouter(),
            ...withHttpTransport({ listenOpts: { port: 3101, host: '127.0.0.1' }, asDefault: true }),
        ),
    ],
    declarations: [UserController, RoleController],
})
export class MockBootLoadTest {

}



@Module({
    imports: [
        ServerModule,
        LoggerModule,
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
        provideService(
            withServiceRouter(),
            ...withHttpTransport({ listenOpts: { port: 3102, host: '127.0.0.1' }, asDefault: true }),
        ),
    ],
    declarations: [UserController, RoleController],
})
export class MockTransBootTest {

}

@Module({
    imports: [
        ServerModule,
        LoggerModule,
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
        provideService(
            withServiceRouter(),
            ...withHttpTransport({
                listenOpts: { port: 3000, host: '127.0.0.1' },
                serverOpts: { key, cert },
                asDefault: true,
            } as any),
        ),
    ],
    declarations: [UserController, RoleController],
})
export class Http2TransBootTest {

}
