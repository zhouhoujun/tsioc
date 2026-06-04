import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { useHttpTransport, withHttpTransport } from '@tsdi/http';
import { provideService, useRouter, useJson, useStatics } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
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
            entities: [Role, User],
        })
    ]
})
export class MockBootTest {

}


@Module({
    imports: [
        ServerModule,
        LoggerModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [Role, User],
        })
    ],
    providers: [
        provideService(
            useRouter(),
            useStatics(),
            useJson(),
            useHttpTransport({ listenOpts: { port: 3000, host: '127.0.0.1' }, asDefault: true }),
        ),
        provideClient(
            withHttpTransport({ url: 'http://127.0.0.1:3000', asDefault: true }),
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
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [Role, User],
        })
    ],
    providers: [
        provideService(
            useRouter(),
            useStatics(),
            useJson(),
            useHttpTransport({ listenOpts: { port: 3001, host: '127.0.0.1' }, asDefault: true }),
        ),
        provideClient(
            withHttpTransport({ url: 'http://127.0.0.1:3001', asDefault: true }),
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
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [Role, User],
        })
    ],
    providers: [
        provideService(
            useRouter(),
            useStatics(),
            useJson(),
            useHttpTransport({ listenOpts: { port: 3002, host: '127.0.0.1' }, asDefault: true }),
        ),
        provideClient(
            withHttpTransport({ url: 'http://127.0.0.1:3002', asDefault: true }),
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
        TransactionModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: [Role, User],
        })
    ],
    providers: [
        provideService(
            useRouter(),
            useStatics(),
            useJson(),
            useHttpTransport({
                listenOpts: { port: 3003, host: '127.0.0.1' },
                serverOpts: { key, cert },
                majorVersion: 2,
                asDefault: true,
            } as any),
        ),
        provideClient(
            withHttpTransport({
                authority: 'https://127.0.0.1:3003',
                connectOpts: { ca: cert, rejectUnauthorized: false },
                asDefault: true,
            } as any),
        ),
    ],
    declarations: [UserController, RoleController],
})
export class Http2TransBootTest {

}
