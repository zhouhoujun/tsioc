import { DIModule, IConnectionOptions } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TypeOrmModule } from '../src';
import { Connection } from 'typeorm';
import { User } from './models/models';

@DIModule({
    baseURL: __dirname,
    imports: [
        ServerBootstrapModule,
        TypeOrmModule
    ]
})
export class MockBootTest {

}


export const connectOption = <IConnectionOptions>{
    async initDb(connection: Connection) {
        console.log('init db connection', connection.options);
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
    password: '',
    database: 'testdb',
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
}
