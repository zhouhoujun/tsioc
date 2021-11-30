import { RepositoryArgumentResolver, RepositoryMetadata, TransactionResolvers } from '@tsdi/core';
import { OperationArgumentResolver, Parameter, InvocationContext, Type, lang, Inject, ArgumentError } from '@tsdi/ioc';
import {
    getConnection, getCustomRepository, getMongoRepository, getRepository,
    getTreeRepository, MongoRepository, Repository, TreeRepository
} from 'typeorm';
import { DEFAULT_CONNECTION } from './objectid.pipe';

export class TypeormTransactionResolvers extends TransactionResolvers {
    get resolvers(): OperationArgumentResolver<any>[] {
        throw new Error('Method not implemented.');
    }
    canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean {
        throw new Error('Method not implemented.');
    }
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T {
        throw new Error('Method not implemented.');
    }

}


export class TypeormRepositoryArgumentResolver extends RepositoryArgumentResolver {

    constructor(@Inject(DEFAULT_CONNECTION, { defaultValue: undefined }) private conn: string) {
        super();
    }

    canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean {
        let { model, connection } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn;
        }

        if(!parameter.type || !lang.isExtendsClass(parameter.type, Repository)) {
            throw new ArgumentError(`Autowired repository design type not defined, or not extends with TypeORM Repository`);
        }

        if (!model || !getConnection(connection).hasMetadata(model)) {
            throw new ArgumentError(`Autowired repository in${this.getLocal(parameter, ctx)}${ctx.target} failed. It denpendence on model type ${model? model: ''},  please register model in TypeORM first. `);
        }
        return true;
    }
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T {
        let { model, connection } = parameter as RepositoryMetadata;
        if (!connection) {
            connection = this.conn;
        }
        return this.getRepository(model, parameter.type as any, connection);
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

    protected getRepository<T>(model: Type<T>, rep: Type<Repository<T>>, connection?: string) {
        switch (rep) {
            case Repository:
                return getRepository(model, connection);
            case MongoRepository:
                return getMongoRepository(model, connection);
            case TreeRepository:
                return getTreeRepository(model, connection);
            default:
                return getCustomRepository(model, connection);
        }
    }
}
