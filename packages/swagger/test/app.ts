import { Module } from '@tsdi/ioc';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule } from '@tsdi/http';
import { Connection } from 'typeorm';
import { User } from './models/models';
import { UserController } from './mapping/UserController';
import { SwaggerModule } from '../src/swagger.module';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { ConnectionOptions } from '@tsdi/repository';
import { HttpClientModule } from '@tsdi/common/http';
import { EndpointsModule } from '@tsdi/endpoints';
import { AssetTransportModule, Bodyparser, Content, Json } from '@tsdi/endpoints/assets';


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
        AssetTransportModule,
        ServerEndpointModule,
        HttpModule,
        HttpClientModule,
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                majorVersion: 2,
                interceptors: [
                    Content,
                    Json,
                    Bodyparser
                ]
            }
        }),
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
    declarations: [
        // RouteStartup,
        UserController
    ]
})
export class MockBootTest {

}

