import { Module, ModuleWithProviders, ProvdierOf, Type, toProvider } from '@tsdi/ioc';
import { ConnectionOptions, CONNECTIONS, RepositoryArgumentResolver, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeormAdapter } from './TypeormAdapter';
import { TypeormTransactionManager } from './transaction';
import { TypeormRepositoryArgumentResolver, TypeormTransactionResolver } from './resolvers';

export interface TypeormOptions extends ConnectionOptions {
    initDb?(connection: DataSource): Promise<void>;
    /**
     * orm modles.
     */
    entities?: Array<string | Type>;
    /**
     * repositories of orm.
     */
    repositories?: Array<string | Type>;
}

@Module({
    providers: [
        TypeormAdapter,
        ParseObjectIdPipe,
        { provide: RepositoryArgumentResolver, useClass: TypeormRepositoryArgumentResolver },
        { provide: TransactionResolver, useClass: TypeormTransactionResolver },
        { provide: TransactionManager, useClass: TypeormTransactionManager }
    ]
})
export class TypeormModule {
    /**
     * typeorm module with connections.
     * @param connections 
     * @returns 
     */
    static withConnection(...connections: ProvdierOf<TypeormOptions | DataSourceOptions>[]): ModuleWithProviders<TypeormModule> {
        return {
            module: TypeormModule,
            providers: connections.map(c => toProvider(CONNECTIONS, c, true))
        }
    }
}
