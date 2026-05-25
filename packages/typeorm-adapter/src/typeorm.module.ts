import { importProvidersFrom, Module, ModuleWithProviders, ProvdierOf, Provider, toProvider, Type } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ConnectionOptions, CONNECTIONS, RepositoryArgumentResolver, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeormAdapter } from './TypeormAdapter';
import { TypeormTransactionManager } from './transaction';
import { TypeormRepositoryArgumentResolver, TypeormTransactionResolver } from './resolvers';

/**
 * Typeorm options.
 */
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

const providers: Provider[] = [
        TypeormAdapter,
        ParseObjectIdPipe,
        { provide: RepositoryArgumentResolver, useClass: TypeormRepositoryArgumentResolver },
        { provide: TransactionResolver, useClass: TypeormTransactionResolver },
        { provide: TransactionManager, useClass: TypeormTransactionManager }
    ];

@Module({
    imports: [
        LoggerModule
    ],
    providers: [
        ...providers
    ]
})
export class TypeOrmModule {
    /**
     * typeorm module with connections.
     * @param connections
     * @returns
     */
    static withConnection(...connections: ProvdierOf<TypeormOptions | DataSourceOptions>[]): ModuleWithProviders<TypeOrmModule> {
        return {
            module: TypeOrmModule,
            providers: connections.map(c => toProvider(CONNECTIONS, c, true))
        }
    }

    /**
     * Alias for withConnection - register root connections.
     */
    static forRoot(...connections: ProvdierOf<TypeormOptions | DataSourceOptions>[]): ModuleWithProviders<TypeOrmModule> {
        return TypeOrmModule.withConnection(...connections);
    }

    /**
     * Register entities for a specific feature module.
     * @param entities entity classes to register
     */
    static forFeature(entities: Type[]): Provider[] {
        return entities.map(entity => ({
            provide: entity,
            useValue: entity,
        }));
    }
}


/**
 * provide typeorm service.
 * @param connections 
 * @returns 
 */
export function provideTypeOrm(...connections: ProvdierOf<TypeormOptions | DataSourceOptions>[]): Provider[] {
    return [
        ...connections.map(c => toProvider(CONNECTIONS, c, true)),
        ...providers
    ]
}