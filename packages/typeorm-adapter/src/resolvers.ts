import { Parameter, InvocationContext, AbstractType, lang, ArgumentException, isArray, Injectable, Handler } from '@tsdi/ioc';
import { JoinPoint } from '@tsdi/aop';
import { RepositoryArgumentResolver, RepositoryMetadata, TransactionManager, TransactionResolver } from '@tsdi/repository';
import { MongoRepository, Repository, TreeRepository } from 'typeorm';
import { TypeormAdapter } from './TypeormAdapter';


@Injectable()
export class TypeormRepositoryArgumentResolver<TOutput = any> extends RepositoryArgumentResolver<TOutput> {

    constructor(private adapter: TypeormAdapter) {
        super()
    }

    canResolve(parameter: Parameter<any>, ctx: InvocationContext): boolean {
        const { model, connection } = parameter as RepositoryMetadata;

        if (!parameter.type || !lang.isExtends(parameter.type, Repository)) {
            throw new ArgumentException(`Autowired repository design type not defined, or not extends with TypeORM Repository`)
        }

        if (!model || !this.adapter.getConnection(connection).hasMetadata(model)) {
            throw new ArgumentException(`Autowired repository in${this.getLocal(parameter, ctx)}${ctx.targetType} failed. It denpendence on model type ${model ? model : ''},  please register model in TypeORM first. `)
        }
        return true
    }

    intercept(parameter: Parameter, next: Handler<Parameter, TOutput, InvocationContext>, ctx: InvocationContext): TOutput {
        if (!this.canResolve(parameter, ctx)) return next.handle(parameter, ctx);

        const { model, type, connection } = parameter as RepositoryMetadata;
        return this.getRepository(model, type, connection) as TOutput;
    }

    protected getLocal(parameter: Parameter<any>, ctx: InvocationContext) {
        let local: string;
        if (parameter.propertyKey && parameter.name) {
            local = ` method ${ctx.propertyKey?.toString()} param ${parameter.name} of class `
        } else if (parameter.propertyKey) {
            local = ` field ${parameter.propertyKey} of class `
        } else {
            local = ' '
        }
        return local
    }

    protected getRepository(model: AbstractType | undefined, rep: AbstractType | undefined, connection: string | undefined) {
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

    intercept(parameter: Parameter, next: Handler<Parameter, InvocationContext>, ctx: InvocationContext) {
        if (ctx instanceof JoinPoint && isArray(ctx.annotations) && ctx.annotations.length > 0
            && (parameter.provider as AbstractType<any> === TransactionManager || parameter.type as AbstractType<any> === TransactionManager)) {
            if (ctx.has(TransactionManager)) {
                return ctx.get(TransactionManager)
            } else {
                const manager = ctx.get(TransactionManager);
                ctx.setValue(TransactionManager, manager);
                return manager
            }
        }

        return next.handle(parameter, ctx)
    }

}
