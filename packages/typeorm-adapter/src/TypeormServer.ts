import 'reflect-metadata';
import { Log, Logger } from '@tsdi/logs';
import { Type, isString, Injector, EMPTY, isNil, isType } from '@tsdi/ioc';
import { ComponentScan, Startup, OnDispose, PipeTransform, ServerEndpointContext, TransportParameter, PROCESS_ROOT, MODEL_RESOLVERS, ModuleLoader } from '@tsdi/core';
import { ConnectionOptions, createModelResolver, DBPropertyMetadata, missingPropPipe, CONNECTIONS } from '@tsdi/repository';
import {
    getConnection, createConnection, ConnectionOptions as OrmConnOptions, Connection,
    getMetadataArgsStorage, getConnectionManager, getManager
} from 'typeorm';
import { DEFAULT_CONNECTION, ObjectIDToken } from './objectid.pipe';



@ComponentScan()
export class TypeormServer implements Startup, OnDispose {
    /**
     * default connection options.
     */
    protected options!: ConnectionOptions;

    @Log() private logger!: Logger;

    constructor(protected injector: Injector) {

    }

    /**
     * startup server.
     */
    async startup(): Promise<void> {
        this.logger.info('startup db connections');
        const connections = this.injector.get(CONNECTIONS);
        const injector = this.injector;

        if (connections.length > 1) {
            await Promise.all(connections.map((options) => this.statupConnection(injector, options, connections)))
        } else if (connections.length === 1) {
            const options = connections[0];
            options.asDefault = true;
            options.name && injector.setValue(DEFAULT_CONNECTION, options.name);
            await this.statupConnection(injector, options, connections)
        }
    }

    private mdlmap = new Map<Type, DBPropertyMetadata[]>();
    getModelPropertyMetadata(type: Type) {
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
                    } else if (isType(col.type)) {
                        relaModel = col.type;
                    } else {
                        relaModel = col.type();
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
                        mutil: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many'),
                        type: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many') ? Array : relaModel!
                    })
                });
            this.mdlmap.set(type, props)
        }
        return props
    }


    async statupConnection(injector: Injector, options: ConnectionOptions, config: ConnectionOptions[]) {
        if (options.type == 'mongodb') {
            const mgd = await injector.get(ModuleLoader).require('mongodb');
            if (mgd.ObjectID) {
                injector.setValue(ObjectIDToken, mgd.ObjectID)
            }
        }
        const connection = await this.createConnection(options, config);

        const entities = options.entities ?? EMPTY;
        const resovler = createModelResolver({
            isModel: (type) => entities.indexOf(type) >= 0,
            getPropertyMeta: (type) => this.getModelPropertyMetadata(type),
            hasField: (parameter, ctx) => ctx.playload,
            getFields: (parameter: TransportParameter, ctx: ServerEndpointContext) => parameter.field ? ctx.playload[parameter.field] : ctx.playload,
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

        getMetadataArgsStorage().entityRepositories?.forEach(meta => {
            if (options.entities?.some(e => e === meta.entity)) {
                injector.inject({ provide: meta.target, useFactory: () => getManager(options.name!).getCustomRepository(meta.target) })
            }
        });

        if (options.initDb) {
            await options.initDb(connection)
        }
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    async createConnection(options: ConnectionOptions, config: ConnectionOptions[]) {

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
            await loader.loadType({ files: options.repositories.filter(r => isString(r)), basePath: this.injector.get(PROCESS_ROOT) })
        }
        if (options.asDefault) {
            this.options = options
        }
        return await createConnection(options as OrmConnOptions)
    }

    /**
     * get connection via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     */
    getConnection(connectName?: string): Connection {
        return getConnection(connectName ?? this.options?.name)
    }

    async disconnect(): Promise<void> {
        this.logger?.info('close db connections');
        await Promise.all(getConnectionManager().connections?.map(async c => {
            if (c && c.isConnected) {
                await c.close()
            }
        }))
    }

    async onDispose(): Promise<void> {
        await this.disconnect();
        this.logger = null!;
        this.injector = null!;
        this.options = null!
    }
}
