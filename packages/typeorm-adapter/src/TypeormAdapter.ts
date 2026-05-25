import 'reflect-metadata';
import { AbstractType, isString, Injector, isNil, Static, isFunction, Inject, INJECTOR, Type, isType, InjectUtil, RunContext } from '@tsdi/ioc';
import { Startup, PipeTransform, TransportParameter, ApplicationArguments, MODEL_RESOLVERS, ModuleLoader, Dispose } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { ConnectionOptions, createModelResolver, DBPropertyMetadata, missingPropPipe, CONNECTIONS, toPrimitType } from '@tsdi/repository';
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

    constructor(@Inject(INJECTOR) protected injector: Injector) {
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

    private mdlmap = new Map<AbstractType, DBPropertyMetadata[]>();
    protected getModelPropertyMetadata(type: AbstractType) {
        let props = this.mdlmap.get(type);
        const target = type;
        if (!props) {
            props = [];
            getMetadataArgsStorage().columns
            getMetadataArgsStorage().filterColumns(type)
                .forEach(col => {
                    const opType = col.options.type;
                    let type: AbstractType;
                    let dbtype: string | undefined;
                    if (opType) {
                        if (isType(opType)) {
                            type = opType;
                        } else if (isString(opType)) {
                            dbtype = opType;
                            type = isString(col.target) ? toPrimitType(opType) : Reflect.getMetadata("design:type", col.target.prototype, col.propertyName) ?? toPrimitType(opType);
                        } else {
                            if (col.mode === 'objectId') {
                                dbtype = 'objectId';
                            }
                            type = (opType as PropertyDescriptor).value ?? Object
                        }
                    } else {
                        type = Object;
                    }

                    props!.push({
                        ...col.options,
                        propertyKey: col.propertyName,
                        dbtype,
                        target,
                        type
                    })
                });

            getMetadataArgsStorage().filterRelations(type)
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
                        target,
                        propertyKey: col.propertyName,
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
                InjectUtil.setValue(injector, ObjectIDToken, mgd.ObjectID)
            }
        }

        const dataSource = await this.createConnection(options, config);
        if (options.initDb) {
            await options.initDb(dataSource)
        }

        const entities = options.entities ?? [];
        const resovler = createModelResolver(injector.getRuntime(), {
            isModel: (type) => entities?.includes(type as Type),
            getPropertyMeta: (type) => this.getModelPropertyMetadata(type),
            hasField: (parameter, ctx) => ctx.getPayload()?.body,
            getFields: (parameter: TransportParameter, ctx: RunContext) => parameter.field ? ctx.getPayload()!.body[parameter.field] : ctx.getPayload()!.body,
            fieldResolvers: [
                (input, next, context) => {
                    if (input[0].dbtype === 'objectId') {
                        const [prop, args, target] = input;
                        const value = args[prop.propertyKey] ?? prop.default;
                        if (isNil(value)) return null;
                        const pipe = context.get<PipeTransform>('objectId');
                        if (!pipe) throw missingPropPipe(prop, target)
                        return pipe.transform(value)
                    }
                    return next(input, context);
                },
            ]
        });
        InjectUtil.provider(injector, { provide: MODEL_RESOLVERS, useValue: resovler, multi: true });

        if (getMetadataArgsStorage().entityRepositories?.length) {
            getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                if (options.entities?.some(e => e === meta.entity)) {
                    InjectUtil.provider(injector, { provide: meta.target, useFactory: () => this.getConnection(options.name!)?.getCustomRepository(meta.target) })
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
        const appArgs = this.injector.get(ApplicationArguments, null);
        const basePath = appArgs?.baseURL;
        if (options.entities?.some(m => isString(m))) {
            const entities: Type[] = options.entities.filter(e => !isString(e)) as Type[];
            const models = await loader.loadType({ files: options.entities?.filter(m => isString(m)), basePath });
            models.forEach(mdl => {
                if (mdl && entities.indexOf(mdl) < 0) {
                    entities.push(mdl)
                }
            });
            options.entities = entities
        }

        if (options.repositories && options.repositories.some(r => isString(r))) {
            options.repositories = await loader.loadType({ files: options.repositories.filter(r => isString(r)), basePath })
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
        const name = connectName ?? this.options?.name!;
        const source = this.sources.get(name);
        if (!source) {
            throw new Error(`DataSource "${name}" not found. Available: ${Array.from(this.sources.keys()).join(', ') || 'none'}`);
        }
        return source;
    }

    /**
     * check if a connection exists and is initialized.
     */
    hasConnection(connectName?: string): boolean {
        const name = connectName ?? this.options?.name ?? 'default';
        const source = this.sources.get(name);
        return !!source && source.isInitialized;
    }

    /**
     * get all connection names.
     */
    getConnectionNames(): string[] {
        return Array.from(this.sources.keys());
    }

    /**
     * get connection status.
     */
    getConnectionStatus(connectName?: string): { name: string; initialized: boolean; connected: boolean } {
        const name = connectName ?? this.options?.name!;
        const source = this.sources.get(name);
        if (!source) {
            return { name, initialized: false, connected: false };
        }
        return {
            name,
            initialized: source.isInitialized,
            connected: source.isInitialized,
        };
    }

    /**
     * get all connections status.
     */
    getAllConnectionStatus(): { name: string; initialized: boolean; connected: boolean }[] {
        return Array.from(this.sources.entries()).map(([name, source]) => ({
            name,
            initialized: source.isInitialized,
            connected: source.isInitialized,
        }));
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


    getRepository<T extends ObjectLiteral>(type: AbstractType<T>, connectName?: string): Repository<T> {
        return this.getConnection(connectName).getRepository<T>(type)
    }

    getTreeRepository<T extends ObjectLiteral>(type: AbstractType<T>, connectName?: string): TreeRepository<T> {
        return this.getConnection(connectName).getTreeRepository<T>(type)
    }

    /**
     * custom repository.
     * @deprecated 
     * @param type 
     * @param connectName 
     * @returns 
     */
    getCustomRepository<T extends Repository<any>>(type: AbstractType<T>, connectName?: string): T {
        return this.getConnection(connectName).getCustomRepository(type)
    }

    getMongoRepository<T extends ObjectLiteral>(type: AbstractType<T>, connectName?: string): MongoRepository<T> {
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