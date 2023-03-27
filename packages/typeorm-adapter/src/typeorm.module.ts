import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ConnectionOptions, CONNECTIONS, RepositoryArgumentResolver, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeormAdapter } from './TypeormAdapter';
import { TypeormTransactionManager } from './transaction';
import { TypeormRepositoryArgumentResolver, TypeormTransactionResolver } from './resolvers';


@Module({
    providers: [
        TypeormAdapter,
        ParseObjectIdPipe,
        { provide: RepositoryArgumentResolver, useClass: TypeormRepositoryArgumentResolver, static: true },
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
