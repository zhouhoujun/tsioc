import { BootApplication } from '@tsdi/boot';
import { Connection } from 'typeorm';
import { User } from './src/models/models';
import { MockTransBootTest } from './src/app';

BootApplication.run({
    module: MockTransBootTest,
    configures: [
        {
            connections: {
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
                entities: ['./src/models/**/*.ts'],
                repositories: ['./src/repositories/**/*.ts'],
                // useNewUrlParser: true,
                synchronize: true, // 同步数据库
                logging: false  // 日志
            }

        }
    ]
});