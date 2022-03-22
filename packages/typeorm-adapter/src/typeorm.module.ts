import { ModuleWithProviders } from '@tsdi/ioc';
import { ConnectionOptions, CONNECTIONS, Module, RepositoryArgumentResolver, TransactionManager, TransactionResolver } from '@tsdi/core';
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
export class TypeOrmModule {
    /**
     * typeorm module with connections.
     * @param connections 
     * @returns 
     */
    static withConnection(...connections: ConnectionOptions[]): ModuleWithProviders<TypeOrmModule> {
        return {
            module: TypeOrmModule,
            providers: connections.map(c => ({ provide: CONNECTIONS, useValue: c, multi: true }))
        }
    }
}
