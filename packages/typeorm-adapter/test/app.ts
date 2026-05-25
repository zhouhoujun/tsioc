import { Module } from '@tsdi/ioc';
import { ServerModule } from '@tsdi/platform-server';
import { HttpClientModule } from '@tsdi/common/http';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { BodyparserInterceptor, ContentInterceptor, JsonInterceptor, withHttpTransport } from '@tsdi/http';
import { provideService, withServiceFeatures } from '@tsdi/service';
import { provideClient, withClientFeatures } from '@tsdi/client';
import { withHttpClientTransport } from '@tsdi/http';
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
        ...provideService(
            ...withHttpTransport({ bootstrap: false }),
            withServiceFeatures({
                router: true,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            })
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
        ...provideService(
            ...withHttpTransport({ bootstrap: false }),
            withServiceFeatures({
                router: true,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            })
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
        ...provideService(
            ...withHttpTransport({ bootstrap: false }),
            withServiceFeatures({
                router: true,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            })
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
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts']
        })
    ],
    providers: [
        ...provideClient(
            ...withHttpClientTransport({
                authority: 'https://localhost:3000',
                connectOpts: { ca: cert },
                bootstrap: false,
            } as any),
            withClientFeatures({}),
        ),
        ...provideService(
            ...withHttpTransport({
                listenOpts: { port: 3000 },
                serverOpts: { key, cert },
                bootstrap: false,
            } as any),
            withServiceFeatures({
                router: true,
                interceptors: [
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor,
                ]
            })
        ),
    ],
    declarations: [UserController, RoleController],
})
export class Http2TransBootTest {

}
