import { Joinpoint } from '@tsdi/aop';
import { RepositoryArgumentResolver, RepositoryMetadata, TransactionManager, TransactionResolver } from '@tsdi/core';
import { Parameter, InvocationContext, Type, lang, Inject, ArgumentError, OperationArgumentResolver, isArray, composeResolver, Destroy, Singleton } from '@tsdi/ioc';
import {
    getConnection, MongoRepository, Repository, TreeRepository, getManager
} from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';


export class TypeormRepositoryArgumentResolver extends RepositoryArgumentResolver {

    constructor(@Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string) {
        super();
    }

    canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean {
        let { model, connection } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn;
        }

        if (!parameter.type || !lang.isExtendsClass(parameter.type, Repository)) {
            throw new ArgumentError(`Autowired repository design type not defined, or not extends with TypeORM Repository`);
        }

        if (!model || !getConnection(connection).hasMetadata(model)) {
            throw new ArgumentError(`Autowired repository in${this.getLocal(parameter, ctx)}${ctx.target} failed. It denpendence on model type ${model ? model : ''},  please register model in TypeORM first. `);
        }
        return true;
    }
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T {
        let { model, connection, type } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn;
        }
        return this.getRepository<T>(model, type as Type, connection);
    }

    protected getLocal(parameter: Parameter<any>, ctx: InvocationContext<any>) {
        let local: string;
        if (parameter.propertyKey && parameter.paramName) {
            local = ` method ${ctx.method} param ${parameter.paramName} of class `
        } else if (parameter.propertyKey) {
            local = ` field ${parameter.propertyKey} of class `
        } else {
            local = ' ';
        }
        return local;
    }

    protected getRepository<T>(model: Type<T> | undefined, rep: Type | undefined, connection: string) {
        if (!model) {
            return getManager(connection).getCustomRepository(rep!);
        }
        switch (rep) {
            case Repository:
                return getManager(connection).getRepository(model);
            case MongoRepository:
                return getManager(connection).getMongoRepository(model);
            case TreeRepository:
                return getManager(connection).getTreeRepository(model);
            default:
                return getManager(connection).getCustomRepository(rep!);
        }
    }
}


export class TypeormTransactionResolver extends TransactionResolver {

    protected resolver: OperationArgumentResolver;
    constructor() {
        super();
        this.resolver = composeResolver(
            (param, ctx) => ctx instanceof Joinpoint && isArray(ctx.arguments['annotation']) && ctx.arguments['annotation'].length > 0,
            {
                canResolve: (param, ctx: Joinpoint) => {
                    return param.provider === TransactionManager || param.type === TransactionManager;
                },
                resolve(param, ctx: Joinpoint): any {
                    if (ctx.hasValue(TransactionManager)) {
                        return ctx.get(TransactionManager);
                    } else {
                        const manager = ctx.get(TransactionManager, ctx);
                        ctx.setValue(TransactionManager, manager);
                        return manager;
                    }
                }
            })
    }

    canResolve(parameter: Parameter, ctx: InvocationContext<any>): boolean {
        return this.resolver.canResolve(parameter, ctx);
    }
    resolve(parameter: Parameter, ctx: InvocationContext<any>) {
        return this.resolver.resolve(parameter, ctx);
    }

}
