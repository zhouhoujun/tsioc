import 'reflect-metadata';
import { ILogger, Logger } from '@tsdi/logs';
import { Type, isString, isArray, Injector, isFunction, EMPTY, isNil } from '@tsdi/ioc';
import {
    ConnectionOptions, ApplicationContext, ComponentScan, Startup, createModelResolver,
    DBPropertyMetadata, PipeTransform, missingPropPipeError, MODEL_RESOLVERS, OnDispose, TransportParameter, TransportContext, CONNECTIONS
} from '@tsdi/core';
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

    @Logger() private logger!: ILogger;

    constructor(protected ctx: ApplicationContext) {

    }

    /**
     * startup server.
     */
    async startup(): Promise<void> {
        let ctx = this.ctx;
        this.logger.info('startup db connections');
        const connections = this.ctx.resolve(CONNECTIONS);
        const injector = ctx.injector;

        // if (connections.repositories && connections.repositories.some(r => isString(r))) {
        //     let loader = this.ctx.injector.getLoader();
        //     // preload repositories for typeorm.
        //     await loader.loadType({ files: connections.repositories.filter(r => isString(r)), basePath: this.ctx.baseURL });
        // }
        if (connections.length > 1) {
            await Promise.all(connections.map((options) => this.statupConnection(injector, options, connections)));
        } else if (connections.length === 1) {
            let options = connections[0];
            options.asDefault = true;
            options.name && injector.setValue(DEFAULT_CONNECTION, options.name);
            await this.statupConnection(injector, options, connections);
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
                        propertyKey: col.propertyName,
                        primary: col.options.primary,
                        nullable: col.options.nullable,
                        precision: col.options.precision,
                        length: col.options.length,
                        width: col.options.width,
                        default: col.options.default,
                        dbtype: isString(col.options.type) ? col.options.type : (col.mode === 'objectId' ? 'objectId' : ''),
                        type: isString(col.options.type) ? Object : col.options.type!
                    });
                });

            getMetadataArgsStorage().relations.filter(col => col.target === type)
                .forEach(col => {
                    let relaModel = isFunction(col.type) ? col.type() as Type : undefined;
                    props?.push({
                        propertyKey: col.propertyName,
                        provider: relaModel,
                        nullable: col.options.nullable,
                        mutil: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many'),
                        type: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many') ? Array : relaModel!
                    });
                });
            this.mdlmap.set(type, props);
        }
        return props;
    }


    async statupConnection(injector: Injector, options: ConnectionOptions, config: ConnectionOptions[]) {
        if (options.type == 'mongodb') {
            const mgd = await injector.getLoader().require('mongodb');
            if (mgd.ObjectID) {
                injector.setValue(ObjectIDToken, mgd.ObjectID);
            }
        }
        const connection = await this.createConnection(options, config);

        const entities = options.entities ?? EMPTY;
        const resovler = createModelResolver({
            isModel: (type) => entities.indexOf(type) >= 0,
            getPropertyMeta: (type) => this.getModelPropertyMetadata(type),
            hasField: (parameter, ctx) => ctx instanceof TransportContext && ctx.body,
            getFields: (parameter: TransportParameter, ctx: TransportContext) => parameter.field ? ctx.request.body[parameter.field] : ctx.request.body,
            fieldResolvers: [
                {
                    canResolve: (prop, ctx, fields) => prop.dbtype === 'objectId',
                    resolve: (prop, ctx, fields, target) => {
                        const value = fields[prop.propertyKey];
                        if (isNil(value)) return null;
                        const pipe = ctx.get<PipeTransform>('objectId');
                        if (!pipe) throw missingPropPipeError(prop, target)
                        return pipe.transform(value, prop.enum);
                    }
                }
            ]
        })
        injector.inject({ provide: MODEL_RESOLVERS, useValue: resovler, multi: true });

        getMetadataArgsStorage().entityRepositories?.forEach(meta => {
            if (options.entities?.some(e => e === meta.entity)) {
                injector.inject({ provide: meta.target, useFactory: () => getManager(options.name!).getCustomRepository(meta.target) });
            }
        });

        // if (options.initDb) {
        //     await options.initDb(connection);
        // }
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    async createConnection(options: ConnectionOptions, config: ConnectionOptions[]) {

        let entities: Type[] = [];
        if (options.entities?.some(m => isString(m))) {
            let loader = this.ctx.injector.getLoader();
            let models = await loader.loadType({ files: options.entities?.filter(m => isString(m)), basePath: this.ctx.baseURL });
            models.forEach(mdl => {
                if (mdl && entities.indexOf(mdl) < 0) {
                    entities.push(mdl);
                }
            });
        } else {
            entities = options.entries as Type[];
        }
        options.entities = entities;

        if (options.repositories && options.repositories.some(r => isString(r))) {
            let loader = this.ctx.injector.getLoader();
            // preload repositories for typeorm.
            await loader.loadType({ files: options.repositories.filter(r => isString(r)), basePath: this.ctx.baseURL });
        }
        if (options.asDefault) {
            this.options = options;
        }
        return await createConnection(options as OrmConnOptions);
    }

    /**
     * get connection via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     */
    getConnection(connectName?: string): Connection {
        return getConnection(connectName ?? this.options?.name);
    }

    async disconnect(): Promise<void> {
        this.logger?.info('close db connections');
        await Promise.all(getConnectionManager().connections?.map(async c => {
            if (c && c.isConnected) {
                await c.close();
            }
        }));
    }

    async onDispose(): Promise<void> {
        await this.disconnect();
        this.logger = null!;
        this.ctx = null!;
        this.options = null!;
    }
}
