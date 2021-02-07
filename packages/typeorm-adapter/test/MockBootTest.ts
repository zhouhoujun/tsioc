import { DIModule, IConnectionOptions, RouteMapping } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TypeOrmModule } from '../src';
import { Connection } from 'typeorm';
import { User } from './models/models';
import { Inject } from '@tsdi/ioc';
import { UserRepository } from './repositories/UserRepository';



@RouteMapping('/users')
export class UserController {

    @Inject() usrRep: UserRepository;

    @RouteMapping('/:name', 'get')
    getUser(name: string) {
        return this.usrRep.findByAccount(name);
    }

    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    modify(user: User) {
        console.log(user);
        return this.usrRep.save(user);
    }

    @RouteMapping('/:id', 'delete')
    async del(id: string) {
       await this.usrRep.delete(id);
       return true;
    }

}

@DIModule({
    baseURL: __dirname,
    imports: [
        ServerBootstrapModule,
        TypeOrmModule
    ],
    providers:[
        UserController
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
    password: 'zhouyou81',
    database: 'testdb',
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
}
