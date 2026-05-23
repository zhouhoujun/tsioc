import { Module } from '@tsdi/ioc';
import { HttpClientModule } from '@tsdi/common/http';
import { ConnectionOptions } from '@tsdi/repository';
import {  provideService } from '@tsdi/service';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { ServerModule } from '@tsdi/platform-server';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { Connection } from 'typeorm';
import { User } from './models/models';
import { UserController } from './mapping/UserController';
import { SwaggerModule } from '../src/swagger.module';
import { withHttpClientTransport, withHttpTransport } from '@tsdi/http';


export const option = <ConnectionOptions>{
    async initDb(connection: Connection) {
        console.log('init db connection', connection.options);
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
}



@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        ServerCommonModule,
        HttpClientModule,
        // EndpointModule.register({
        //     transport: 'http',
        //     config: {
        //         majorVersion: 2,
        //         interceptors: [
        //             ContentInterceptor,
        //             JsonInterceptor,
        //             BodyparserInterceptorp
        //         ]
        //     }
        // }),
        
        TypeOrmModule.withConnection({
            ...option,
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts'],
        }),
        SwaggerModule.withOptions({
            title: 'api document',
            version: 'v1',
            prefix: 'api-docs'
        }),
    ],
    providers: [
        provideService(
            // withContent(),
            // withJson(),
            // withBodyparser(),
            withHttpTransport()
        ),
    ],
    declarations: [
        // RouteStartup,
        UserController
    ]
})
export class MockBootTest {

}

