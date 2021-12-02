import { Module, RepositoryArgumentResolver, TransactionManager, TransactionResolver } from '@tsdi/core';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeOrmHelper } from './helper';
import { TypeormServer } from './TypeormServer';
import { TypeormTransactionManager } from './transaction';
import { TypeormRepositoryArgumentResolver, TypeormTransactionResolver } from './resolvers';

@Module({
    providers: [
        TypeormServer,
        TypeOrmHelper,
        ParseObjectIdPipe,
        { provide: RepositoryArgumentResolver, useClass: TypeormRepositoryArgumentResolver, singleton: true },
        { provide: TransactionResolver, useClass: TypeormTransactionResolver },
        { provide: TransactionManager, useClass: TypeormTransactionManager }
    ]
})
export class TypeOrmModule { }
