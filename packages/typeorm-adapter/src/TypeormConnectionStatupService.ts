import 'reflect-metadata';
import { IBootContext, IConnectionOptions, RunnableConfigure, ConnectionStatupService } from '@tsdi/boot';
import { Singleton, Type, isString, isArray } from '@tsdi/ioc';
import { getConnection, createConnection, ConnectionOptions, Connection, getMetadataArgsStorage, getCustomRepository } from 'typeorm';


@Singleton()
export class TypeormConnectionStatupService extends ConnectionStatupService {
    /**
     * default connection options.
     */
    protected options: IConnectionOptions;
    protected ctx: IBootContext;

    /**
     * configure service.
     * @param ctx context.
     */
    async configureService(ctx: IBootContext): Promise<void> {
        this.ctx = ctx;
        const config = this.ctx.getConfiguration();
        const injector = ctx.injector;
        if (isArray(config.connections)) {
            await Promise.all(config.connections.map(async (options) => {
                await this.createConnection(options, config);
                getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                    if (options.entities.indexOf(meta.entity as Type)) {
                        injector.set(meta.target, () => getCustomRepository(meta.target, options.name));
                    }
                });
            }));
        } else if (config.connections) {
            let options = config.connections as IConnectionOptions;
            options.asDefault = true;
            await this.createConnection(options, config);
            getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                injector.set(meta.target, () => getCustomRepository(meta.target, options.name));
            });
        }
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    async createConnection(options: IConnectionOptions, config: RunnableConfigure) {
        if (options.asDefault && !options.entities) {
            let entities: Type[] = [];
            let loader = this.ctx.injector.getLoader();
            if (config.models.some(m => isString(m))) {
                let models = await loader.loadTypes({ files: <string[]>config.models, basePath: this.ctx.baseURL });
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
        let connect = await createConnection(options as ConnectionOptions);
        if (options.initDb) {
            await options.initDb(connect);
        }
    }

    /**
     * get connection via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     * @memberof TyepOrmStartupService
     */
    getConnection(connectName?: string): Connection {
        return getConnection(connectName ?? this.options.name);
    }
}
