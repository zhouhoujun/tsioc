import 'reflect-metadata';
import { ILogger } from '@tsdi/logs';
import { Type, isString, isArray, Injector, isFunction, EMPTY, isNil } from '@tsdi/ioc';
import {
    ConnectionOptions, Configuration, ApplicationContext, Configure, Server, createModelResolver,
    DBPropertyMetadata, PipeTransform, missingPropPipeError, MODEL_RESOLVERS
} from '@tsdi/core';
import {
    getConnection, createConnection, ConnectionOptions as OrmConnOptions, Connection,
    getMetadataArgsStorage, getCustomRepository, getConnectionManager
} from 'typeorm';
import { ObjectIDToken } from './objectid.pipe';



@Configure()
export class TypeormServer implements Server {
    /**
     * default connection options.
     */
    protected options!: ConnectionOptions;
    protected ctx!: ApplicationContext;

    private logger!: ILogger;
    /**
     * configure service.
     * @param ctx context.
     */
    async connect(ctx: ApplicationContext): Promise<void> {
        this.ctx = ctx;
        const logger = this.logger = ctx.getLogManager()?.getLogger();
        logger?.info('startup db connections');
        const config = this.ctx.getConfiguration();
        const injector = ctx.injector;

        if (config.repositories && config.repositories.some(r => isString(r))) {
            let loader = this.ctx.injector.getLoader();
            // preload repositories for typeorm.
            await loader.loadType({ files: config.repositories.filter(r => isString(r)), basePath: this.ctx.baseURL });
        }
        if (isArray(config.connections)) {
            await Promise.all(config.connections.map((options) => this.statupConnection(injector, options, config)));
        } else if (config.connections) {
            let options = config.connections;
            options.asDefault = true;
            await this.statupConnection(injector, options, config);
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


    async statupConnection(injector: Injector, options: ConnectionOptions, config: Configuration) {
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
            fieldResolvers: [
                {
                    canResolve: (prop, ctx, fields) => prop.dbtype === 'objectId',
                    resolve: (prop, ctx, fields, target) => {
                        const value = fields[prop.propertyKey];
                        if (isNil(value)) return null;
                        const pipe = ctx.injector.get<PipeTransform>('objectId');
                        if (!pipe) throw missingPropPipeError(prop, target)
                        return pipe.transform(value, prop.enum);
                    }
                }
            ]
        })
        injector.inject({ provide: MODEL_RESOLVERS, useValue: resovler, multi: true });

        getMetadataArgsStorage().entityRepositories?.forEach(meta => {
            if (options.entities?.some(e => e === meta.entity)) {
                injector.inject({ provide: meta.target, useFactory: () => getCustomRepository(meta.target, options.name) });
            }
        });

        if (options.initDb) {
            await options.initDb(connection);
        }
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    async createConnection(options: ConnectionOptions, config: Configuration) {
        if (options.asDefault && !options.entities) {
            let entities: Type[] = [];
            if (config?.models?.some(m => isString(m))) {
                let loader = this.ctx.injector.getLoader();
                let models = await loader.loadType({ files: config.models.filter(m => isString(m)), basePath: this.ctx.baseURL });
                models.forEach(mdl => {
                    if (mdl && entities.indexOf(mdl) < 0) {
                        entities.push(mdl);
                    }
                });
            } else {
                entities = config.models as Type[];
            }
            options.entities = entities;
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

    disconnect() {
        this.logger?.info('close db connections');
        getConnectionManager().connections?.forEach(c => {
            if (c && c.isConnected) {
                c.close()
            }
        });
    }
}
