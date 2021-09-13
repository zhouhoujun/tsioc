import 'reflect-metadata';
import { ILogger } from '@tsdi/logs';
import { Singleton, Type, isString, isArray, Injector } from '@tsdi/ioc';
import { ConnectionOptions, Configuration, ConnectionStatupService, ApplicationContext } from '@tsdi/core';
import {
    getConnection, createConnection, ConnectionOptions as OrmConnOptions, Connection,
    getMetadataArgsStorage, getCustomRepository, getConnectionManager
} from 'typeorm';



@Singleton()
export class TypeormConnectionStatupService extends ConnectionStatupService {
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
    override async configureService(ctx: ApplicationContext): Promise<void> {
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

    async statupConnection(injector: Injector, options: ConnectionOptions, config: Configuration) {
        const connection = await this.createConnection(options, config);

        options.entities?.forEach(e => {
            injector.register(e);
        });

        getMetadataArgsStorage().entityRepositories?.forEach(meta => {
            if (options.entities?.some(e => e === meta.entity)) {
                injector.set(meta.target, () => getCustomRepository(meta.target, options.name));
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

    protected override destroying() {
        this.logger?.info('close db connections');
        getConnectionManager().connections?.forEach(c => {
            if (c && c.isConnected) {
                c.close()
            }
        });
    }
}
