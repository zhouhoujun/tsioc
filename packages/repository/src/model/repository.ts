import { Abstract, InvocationContext, Interceptor, Parameter, Handler } from '@tsdi/ioc';



/**
 * Repository Argument Resolver.
 */
@Abstract()
export abstract class RepositoryArgumentResolver<TOutput = any> implements Interceptor<Parameter, TOutput, InvocationContext> {
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    abstract intercept(parameter: Parameter, next: Handler<Parameter, TOutput, InvocationContext>, ctx: InvocationContext): TOutput;
}
