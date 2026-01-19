import { Abstract, RunContext, Parameter, Handler, ResolveInterceptor } from '@tsdi/ioc';



/**
 * Repository Argument Resolver.
 */
@Abstract()
export abstract class RepositoryArgumentResolver<TOutput = any> implements ResolveInterceptor<Parameter, TOutput> {
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    abstract intercept(parameter: Parameter, next: Handler<Parameter, TOutput, RunContext>, ctx: RunContext): TOutput;
}
