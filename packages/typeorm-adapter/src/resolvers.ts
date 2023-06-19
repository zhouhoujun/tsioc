import { Joinpoint } from '@tsdi/aop';
import { RepositoryArgumentResolver, RepositoryMetadata, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { Parameter, InvocationContext, Type, lang, ArgumentExecption, OperationArgumentResolver, isArray, composeResolver, Injectable } from '@tsdi/ioc';
import { MongoRepository, Repository, TreeRepository } from 'typeorm';
import { TypeormAdapter } from './TypeormAdapter';


@Injectable()
export class TypeormRepositoryArgumentResolver extends RepositoryArgumentResolver {

    constructor(private adapter: TypeormAdapter) {
        super()
    }

    canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean {
        const { model, connection } = parameter as RepositoryMetadata;

        if (!parameter.type || !lang.isExtendsClass(parameter.type, Repository)) {
            throw new ArgumentExecption(`Autowired repository design type not defined, or not extends with TypeORM Repository`)
        }

        if (!model || !this.adapter.getConnection(connection).hasMetadata(model)) {
            throw new ArgumentExecption(`Autowired repository in${this.getLocal(parameter, ctx)}${ctx.targetType} failed. It denpendence on model type ${model ? model : ''},  please register model in TypeORM first. `)
        }
        return true
    }

    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T {
        const { model, type, connection } = parameter as RepositoryMetadata;
        return this.getRepository(model, type, connection) as T;
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

    protected getRepository(model: Type | undefined, rep: Type | undefined, connection: string | undefined) {
        if (!model) {
            return this.adapter.getCustomRepository(rep!, connection)
        }
        switch (rep) {
            case Repository:
                return this.adapter.getRepository(model, connection)
            case MongoRepository:
                return this.adapter.getMongoRepository(model, connection)
            case TreeRepository:
                return this.adapter.getTreeRepository(model, connection)
            default:
                return this.adapter.getCustomRepository(rep!, connection)
        }
    }
}


@Injectable()
export class TypeormTransactionResolver extends TransactionResolver {

    protected resolver: OperationArgumentResolver;
    constructor() {
        super();
        this.resolver = composeResolver(
            (param, ctx) => ctx instanceof Joinpoint && isArray(ctx.payload['annotation']) && ctx.payload['annotation'].length > 0,
            {
                canResolve: (param, ctx: Joinpoint) => {
                    return param.provider === TransactionManager || param.type === TransactionManager
                },
                resolve(param, ctx: Joinpoint): any {
                    if (ctx.has(TransactionManager)) {
                        return ctx.get(TransactionManager)
                    } else {
                        const manager = ctx.get(TransactionManager);
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
