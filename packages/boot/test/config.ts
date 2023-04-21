import { Connection } from 'typeorm';
import { ApplicationConfiguration } from '../src';
import { User } from './models/models';

export default {
    connections: {
        // entities defalt value
        // entities: ['./models/**/*.(ts|js)'],
        // repositories: ['./repositories/**/*.(ts|js)'],
        async initDb(connection: Connection) {
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
        synchronize: true, // 同步数据库
        logging: false  // 日志
    },
    boot: {
        protocol: 'http2',
        // default load controllers from.
        controllers: ['./controllers/**/*.(ts|js)'],
    }
} as ApplicationConfiguration;
