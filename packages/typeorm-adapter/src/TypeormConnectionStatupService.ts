import 'reflect-metadata';
import { ILogger } from '@tsdi/logs';
import { Singleton, Type, isString, isArray, IInjector } from '@tsdi/ioc';
import { IBootContext, IConnectionOptions, Configure, ConnectionStatupService } from '@tsdi/boot';
import { getConnection, createConnection, ConnectionOptions, Connection, getMetadataArgsStorage, getCustomRepository, getConnectionManager } from 'typeorm';



@Singleton()
export class TypeormConnectionStatupService extends ConnectionStatupService {
    /**
     * default connection options.
     */
    protected options: IConnectionOptions;
    protected ctx: IBootContext;

    private logger: ILogger;
    /**
     * configure service.
     * @param ctx context.
     */
    async configureService(ctx: IBootContext): Promise<void> {
        this.ctx = ctx;
        const logger = this.logger = ctx.getLogManager()?.getLogger();
        logger?.info('startup db connections');
        const config = this.ctx.getConfiguration();
        const injector = ctx.injector;
        if (config?.repositories.some(r => isString(r))) {
            let loader = this.ctx.injector.getLoader();
            // preload repositories for typeorm.
            await loader.loadTypes({ files: config.repositories.filter(r => isString(r)), basePath: this.ctx.baseURL });
        }
        if (isArray(config.connections)) {
            await Promise.all(config.connections.map((options) => this.statupConnection(injector, options, config)));
        } else if (config.connections) {
            let options = config.connections as IConnectionOptions;
            options.asDefault = true;
            await this.statupConnection(injector, options, config);
        }
    }

    async statupConnection(injector: IInjector, options: IConnectionOptions, config: Configure) {
        const connection = await this.createConnection(options, config);
        options.entities.forEach(e=> {
            injector.registerType(e);
        });
        getMetadataArgsStorage().entityRepositories?.forEach(meta => {
            if (options.entities.indexOf(meta.entity as Type) >= 0) {
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
    async createConnection(options: IConnectionOptions, config: Configure) {
        if (options.asDefault && !options.entities) {
            let entities: Type[] = [];
            if (config?.models.some(m => isString(m))) {
                let loader = this.ctx.injector.getLoader();
                let models = await loader.loadTypes({ files: config.models.filter(m => isString(m)), basePath: this.ctx.baseURL });
                models.forEach(ms => {
                    ms.forEach(mdl => {
                        if (mdl && entities.indexOf(mdl) < 0) {
                            entities.push(mdl);
                        }
                    });
                });
            } else {
                entities = config.models as Type[];
            }
            options.entities = entities;
        }
        if (options.asDefault) {
            this.options = options;
        }
        return await createConnection(options as ConnectionOptions);
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

    protected destroying() {
        this.logger?.info('close db connections');
        getConnectionManager().connections?.forEach(c => c?.close());
    }
}
