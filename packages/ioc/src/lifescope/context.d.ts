import { Context } from '../context';
import { DefaultContext, RunContext } from '../handlers/contexts';
import { Injector } from '../injector';
import { DecoratorFn } from '../metadata/define';
import { DependLike } from '../providers';
import { Parameters } from '../resolver';
import { Runtime } from '../runtime';
import { Token } from '../tokens';
export declare class IocContext extends DefaultContext {
    get runtime(): Runtime;
    get injector(): Injector;
    /**
     * the token to provide.
     */
    get provide(): Token | null;
    /**
     * whether the context is mutil.
     */
    get isMutil(): boolean;
    get currDecor(): DecoratorFn | null;
    set currDecor(value: DecoratorFn | null);
}
export declare class RuntimeContext extends IocContext {
    /**
     * raise injector
     */
    get raiseInjector(): Injector;
    /**
     * constructor parameters.
     */
    get params(): Parameters;
    /**
     * constructor arguments.
     */
    get args(): any[] | null;
    set args(value: any[] | null);
    get instance(): any;
    set instance(value: any);
}
export declare function createDesignContext(injector: Injector, previous?: Context, runtime?: Runtime, multi?: boolean, provide?: Token | null): IocContext;
export declare function createRuntimeContext(injector: Injector, previous?: Context, runtime?: Runtime, runContext?: RunContext, multi?: boolean, params?: DependLike[]): RuntimeContext;
