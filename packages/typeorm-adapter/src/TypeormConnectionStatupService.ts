import 'reflect-metadata';
import { IBootContext, IConnectionOptions, RunnableConfigure, ConnectionStatupService } from '@tsdi/boot';
import { Singleton, Type, isString, isArray } from '@tsdi/ioc';
import { getConnection, createConnection, ConnectionOptions, Connection, getMetadataArgsStorage, getCustomRepository, getConnectionManager } from 'typeorm';


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
        let repositories: Type[];
        if (config.repositories && config.repositories.some(m => isString(m))) {
            let loader = this.ctx.injector.getLoader();
            let types = await loader.loadTypes({ files: <string[]>config.repositories, basePath: this.ctx.baseURL });
            repositories = [];
            types.forEach(ms => {
                ms.forEach(mdl => {
                    if (mdl && repositories.indexOf(mdl) < 0) {
                        repositories.push(mdl);
                    }
                });
            });
        } else {
            repositories = config.repositories as Type[];
        }
        if (isArray(config.connections)) {
            await Promise.all(config.connections.map(async (options) => {
                let connection = await this.createConnection(options, config);
                if (options.initDb) {
                    await options.initDb(connection);
                }
                getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                    if (options.entities.indexOf(meta.target as Type)) {
                        injector.set(meta.target, () => getCustomRepository(meta.target, options.name));
                    }
                });
            }));
        } else if (config.connections) {
            let options = config.connections as IConnectionOptions;
            options.asDefault = true;
            let connection = await this.createConnection(options, config);
            if (options.initDb) {
                await options.initDb(connection);
            }
            getMetadataArgsStorage().entityRepositories?.forEach(meta => {
                injector.set(meta.target, () => getCustomRepository(meta.target, options.name));
            });
        }

        repositories.forEach(r => {
            if (!injector.has(r)) {
                injector.set(r, () => getCustomRepository(r));
            }
        });
    }

    /**
     * create connection.
     * @param options connenction options.
     * @param config config
     */
    async createConnection(options: IConnectionOptions, config: RunnableConfigure) {
        if (options.asDefault && !options.entities) {
            let entities: Type[] = [];
            if (config.models.some(m => isString(m))) {
                let loader = this.ctx.injector.getLoader();
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
        return await createConnection(options as ConnectionOptions);
    }

    /**
     * get connection via name.
     *
     * @param {string} [connectName]
     * @returns {Connection}
     * @memberof TyepOrmStartupService
     */
    getConnection(connectName?: string): Connection {
        return getConnection(connectName ?? this.options?.name);
    }

    stop() {
        getConnectionManager().connections.forEach(c => {
            c && c.close();
        })
    }
}
