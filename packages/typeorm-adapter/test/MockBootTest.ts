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
        console.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async modify(user: User) {
        console.log('user:', user);
        try {
            const sd = await this.usrRep.save(user);
            console.log(sd);
            return sd;
        } catch (err) {
            console.log(err);
        }
    }

    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        console.log('id:', id);
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
    providers: [
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
    password: '',
    database: 'testdb',
    // useNewUrlParser: true,
    synchronize: true, // 同步数据库
    logging: false  // 日志
}
