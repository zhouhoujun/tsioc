import 'reflect-metadata';
import { InjectLog, Logger } from '@tsdi/logger';
import { Type, isString, Injector, EMPTY, isNil, isType, Static, isFunction } from '@tsdi/ioc';
import { Startup, PipeTransform, TransportParameter, PROCESS_ROOT, MODEL_RESOLVERS, ModuleLoader, Dispose, HandlerContext } from '@tsdi/core';
import { ConnectionOptions, createModelResolver, DBPropertyMetadata, missingPropPipe, CONNECTIONS } from '@tsdi/repository';
import { getMetadataArgsStorage, EntitySchema, DataSource, DataSourceOptions, ObjectLiteral, Repository, MongoRepository, TreeRepository, EntityManager } from 'typeorm';
import { ObjectIDToken } from './objectid.pipe';


/**
 * Typeorm adapter service
 */
@Static()
export class TypeormAdapter {
    /**
     * default connection options.
     */
    protected options!: ConnectionOptions;

    private sources: Map<string, DataSource>;

    @InjectLog() private logger!: Logger;

    constructor(protected injector: Injector) {
        this.sources = new Map();
    }

    /**
     * startup server.
     */
    @Startup()
    protected async startup(): Promise<void> {
        this.logger.info('startup db connections');
        const connections = this.injector.get(CONNECTIONS);
        const injector = this.injector;

        if (connections.length > 1) {
            await Promise.all(connections.map((options) => this.statupConnection(injector, options, connections)))
        } else if (connections.length === 1) {
            const options = connections[0];
            options.asDefault = true;
            await this.statupConnection(injector, options, connections)
        }
    }

    private mdlmap = new Map<Type, DBPropertyMetadata[]>();
    protected getModelPropertyMetadata(type: Type) {
        let props = this.mdlmap.get(type);
        if (!props) {
            props = [];
            getMetadataArgsStorage().columns.filter(col => col.target === type)
                .forEach(col => {
                    props?.push({
                        name: col.propertyName,
                        primary: col.options.primary,
                        nullable: col.options.nullable,
                        precision: col.options.precision,
                        length: col.options.length,
                        width: col.options.width,
                        default: col.options.default,
                        dbtype: isString(col.options.type) ? col.options.type : (col.mode === 'objectId' ? 'objectId' : ''),
                        type: isString(col.options.type) ? Object : col.options.type!
                    })
                });

            getMetadataArgsStorage().relations.filter(col => col.target === type)
                .forEach(col => {
                    let relaModel: Type;
                    if (isString(col.type)) {
                        relaModel = col.type as any;
                    } else if (isType(col.type) && Reflect.getMetadataKeys(col.type)?.length) {
                        relaModel = col.type;
                    } else if (isFunction(col.type)) {
                        relaModel = col.type();
                    } else if (col.type instanceof EntitySchema) {
                        relaModel = col.type.options.target as Type;
                    } else {
                        return;
                    }
                    // else if (isFunction(col.type)) {
                    //     relaModel = col.type();
                    // } else if (col.type instanceof EntitySchema) {
                    //     relaModel = EntitySchema;
                    // } else {
                    //     relaModel = col.type.type as Type;
                    // }
                    props?.push({
                        name: col.propertyName,
                        provider: relaModel,
                        nullable: col.options.nullable,
                        multi: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many'),
                        type: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many') ? Array : relaModel!
                    })
                });
            this.mdlmap.set(type, props)
        }
        return props
    }


    protected async statupConnection(injector: Injector, options: ConnectionOptions, config: ConnectionOptions[]) {
        if (options.type == 'mongodb') {
            const mgd = await injector.get(ModuleLoader).require('mongodb');
            if (mgd.ObjectID) {
                injector.setValue(ObjectIDToken, mgd.ObjectID)
            }
        }

        const dataSource = await this.createConnection(options, config);

        if (options.initDb) {
            await options.initDb(dataSource)
        }

        const entities = options.entities ?? EMPTY;
        const resovler = createModelResolver({
            isModel: (type) => entities.indexOf(type) >= 0,
            getPropertyMeta: (type) => this.getModelPropertyMetadata(type),
            hasField: (parameter, ctx) => ctx.args.body,
            getFields: (parameter: TransportParameter, ctx: HandlerContext) => parameter.field ? ctx.args.body[parameter.field] : ctx.args.body,
            fieldResolvers: [
                {
                    canResolve: (prop, ctx, fields) => prop.dbtype === 'objectId',
                    resolve: (prop, ctx, fields, target) => {
                        const value = fields[prop.name];
                        if (isNil(value)) return null;
                        const pipe = ctx.get<PipeTransform>('objectId');
                        if (!pipe) throw missingPropPipe(prop, target)
                        return pipe.transform(value, prop.enum)
                    }
                }
            ]
        });
        injector.inject({ provide: MODEL_RESOLVERS, useValue: resovler, multi: true });

        if (getMetadataArgsStorage().entityRepositories?.length) {
            getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                if (options.entities?.some(e => e === meta.entity)) {
                    injector.inject({ provide: meta.target, useFactory: () => this.getConnection(options.name!)?.getCustomRepository(meta.target) })
                }
            });
        }
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    protected async createConnection(options: ConnectionOptions, config: ConnectionOptions[]) {

        const loader = this.injector.get(ModuleLoader);
        if (options.entities?.some(m => isString(m))) {
            const entities: Type[] = options.entities.filter(e => !isString(e)) as Type[];
            const models = await loader.loadType({ files: options.entities?.filter(m => isString(m)), basePath: this.injector.get(PROCESS_ROOT) });
            models.forEach(mdl => {
                if (mdl && entities.indexOf(mdl) < 0) {
                    entities.push(mdl)
                }
            });
            options.entities = entities
        }

        if (options.repositories && options.repositories.some(r => isString(r))) {
            // preload repositories for typeorm.
            options.repositories = await loader.loadType({ files: options.repositories.filter(r => isString(r)), basePath: this.injector.get(PROCESS_ROOT) })
        }

        if (!options.name) {
            options.name = 'default';
        }

        if (options.asDefault || options.name === 'default') {
            this.options = options;
        }


        const dataSource = new DataSource(options as DataSourceOptions);
        await dataSource.initialize();

        this.sources.set(options.name, dataSource);
        return dataSource;
    }

    /**
     * get connection via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     */
    getConnection(connectName?: string): DataSource {
        return this.sources.get(connectName ?? this.options.name!)!;
    }

    /**
     * get manager via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     */
    getManager(connectName?: string): EntityManager {
        return this.sources.get(connectName ?? this.options.name!)!.manager!;
    }


    getRepository<T extends ObjectLiteral>(type: Type<T>, connectName?: string): Repository<T> {
        return this.getConnection(connectName).getRepository<T>(type)
    }

    getTreeRepository<T extends ObjectLiteral>(type: Type<T>, connectName?: string): TreeRepository<T> {
        return this.getConnection(connectName).getTreeRepository<T>(type)
    }

    /**
     * custom repository.
     * @deprecated 
     * @param type 
     * @param connectName 
     * @returns 
     */
    getCustomRepository<T extends Repository<any>>(type: Type<T>, connectName?: string): T {
        return this.getConnection(connectName).getCustomRepository(type)
    }

    getMongoRepository<T extends ObjectLiteral>(type: Type<T>, connectName?: string): MongoRepository<T> {
        return this.getConnection(connectName).getMongoRepository<T>(type)
    }


    @Dispose()
    protected async onDispose(): Promise<void> {
        await this.disconnect();
        this.sources.clear();
        this.logger = null!;
        this.injector = null!;
        this.options = null!
    }

    protected async disconnect(): Promise<void> {
        this.logger?.info('close db connections');
        await Promise.all(Array.from(this.sources.values()).map(async c => {
            if (c && c.isInitialized) {
                await c.destroy()
            }
        }))
    }
}

/**
 * Typeorm Helper
 * @deprecated use `TypeormAdapter` instead.
 */
export const TypeOrmHelper = TypeormAdapter;

/**
 * TypeormServer
 * @deprecated use `TypeormAdapter` instead.
 */
export const TypeormServer = TypeormAdapter;