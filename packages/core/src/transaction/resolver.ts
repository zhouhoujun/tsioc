import { Abstract, InvocationContext, OperationArgumentResolver, Parameter } from '@tsdi/ioc';

@Abstract()
export abstract class TransactionResolvers<C = any> implements OperationArgumentResolver<C> {
    abstract get resolvers(): OperationArgumentResolver[];
    abstract canResolve(parameter: Parameter<any>, ctx: InvocationContext<C>): boolean;
    abstract resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T;
}