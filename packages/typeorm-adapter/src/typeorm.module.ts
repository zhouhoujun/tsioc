import { Module, RepositoryArgumentResolver } from '@tsdi/core';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeOrmHelper } from './helper';
import { TypeormServer } from './TypeormServer';
import { TypeormTransactionManager } from './transaction';
import { TypeormRepositoryArgumentResolver } from './resolvers';

@Module({
    providers: [
        TypeormServer,
        TypeOrmHelper,
        ParseObjectIdPipe,
        { provide: RepositoryArgumentResolver, useClass: TypeormRepositoryArgumentResolver, singleton: true },
        TypeormTransactionManager
    ]
})
export class TypeOrmModule { }
