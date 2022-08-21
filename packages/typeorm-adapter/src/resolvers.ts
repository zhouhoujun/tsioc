import { Joinpoint } from '@tsdi/aop';
import { RepositoryArgumentResolver, RepositoryMetadata, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { Parameter, InvocationContext, Type, lang, Inject, ArgumentExecption, OperationArgumentResolver, isArray, composeResolver } from '@tsdi/ioc';
import { getConnection, MongoRepository, Repository, TreeRepository, getManager } from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';


export class TypeormRepositoryArgumentResolver extends RepositoryArgumentResolver {

    constructor(@Inject(DEFAULT_CONNECTION, { nullable: true }) private conn: string) {
        super()
    }

    canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean {
        const { model } = parameter as RepositoryMetadata;
        let { connection } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn
        }

        if (!parameter.type || !lang.isExtendsClass(parameter.type, Repository)) {
            throw new ArgumentExecption(`Autowired repository design type not defined, or not extends with TypeORM Repository`)
        }

        if (!model || !getConnection(connection).hasMetadata(model)) {
            throw new ArgumentExecption(`Autowired repository in${this.getLocal(parameter, ctx)}${ctx.targetType} failed. It denpendence on model type ${model ? model : ''},  please register model in TypeORM first. `)
        }
        return true
    }

    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T {
        const { model, type } = parameter as RepositoryMetadata;
        let { connection } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn
        }
        return this.getRepository<T>(model, type as Type, connection)
    }

    protected getLocal(parameter: Parameter<any>, ctx: InvocationContext<any>) {
        let local: string;
        if (parameter.propertyKey && parameter.name) {
            local = ` method ${ctx.methodName} param ${parameter.name} of class `
        } else if (parameter.propertyKey) {
            local = ` field ${parameter.propertyKey} of class `
        } else {
            local = ' '
        }
        return local
    }

    protected getRepository<T>(model: Type<T> | undefined, rep: Type | undefined, connection: string) {
        if (!model) {
            return getManager(connection).getCustomRepository(rep!)
        }
        switch (rep) {
            case Repository:
                return getManager(connection).getRepository(model)
            case MongoRepository:
                return getManager(connection).getMongoRepository(model)
            case TreeRepository:
                return getManager(connection).getTreeRepository(model)
            default:
                return getManager(connection).getCustomRepository(rep!)
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
                    return param.provider === TransactionManager || param.type === TransactionManager
                },
                resolve(param, ctx: Joinpoint): any {
                    if (ctx.has(TransactionManager)) {
                        return ctx.get(TransactionManager)
                    } else {
                        const manager = ctx.get(TransactionManager, ctx);
                        ctx.setValue(TransactionManager, manager);
                        return manager
                    }
                }
            })
    }

    canResolve(parameter: Parameter, ctx: InvocationContext<any>): boolean {
        return this.resolver.canResolve(parameter, ctx)
    }

    resolve(parameter: Parameter, ctx: InvocationContext<any>) {
        return this.resolver.resolve(parameter, ctx)
    }

}
