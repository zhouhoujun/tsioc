import { TransactionResolvers } from '@tsdi/core';
import { OperationArgumentResolver, Parameter, InvocationContext } from '@tsdi/ioc';

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