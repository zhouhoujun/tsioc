import { DIModule } from '@tsdi/core';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule, HttpServer } from '@tsdi/transport-http';
import { Connection } from 'typeorm';
import { User } from './models/models';
import { UserController } from './mapping/UserController';
import { SwaggerModuel } from '../src/swagger.module';
import { ServerModule } from '@tsdi/platform-server';
import { ConnectionOptions } from '@tsdi/repository';
import { HttpClientModule } from '@tsdi/common';


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



@DIModule({
    baseURL: __dirname,
    imports: [
        ServerModule,
        HttpModule.withOption({
            majorVersion: 2
        }),
        HttpClientModule,
        TypeOrmModule.withConnection({
            ...option,
            entities: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts'],
        }),
        SwaggerModuel,
    ],
    declarations: [
        // RouteStartup,
        UserController
    ],
    bootstrap: HttpServer
})
export class MockBootTest {

}

