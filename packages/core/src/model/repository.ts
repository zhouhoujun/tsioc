import { Abstract, InvocationContext, OperationArgumentResolver, Parameter } from '@tsdi/ioc';


@Abstract()
export abstract class RepositoryArgumentResolver implements OperationArgumentResolver {
    abstract canResolve(parameter: Parameter<any>, ctx: InvocationContext<any>): boolean;
    abstract resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T;
}