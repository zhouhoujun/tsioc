import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { TransactionModule } from '@tsdi/repository';
import { TypeOrmModule, TypeormOptions } from '../src';
import { Role, User } from './models/models';

export const testDbOptions = {
    name: 'testdb',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'testdb',
    synchronize: true,
    logging: false
} as TypeormOptions;


@Module({
    imports: [
        LoggerModule,
        TransactionModule,
        TypeOrmModule.withConnection({
            ...testDbOptions,
            entities: [
                Role,
                User
            ]
        })
    ]
})
export class SimpleTestModule {

}
