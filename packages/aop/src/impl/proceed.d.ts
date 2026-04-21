import { Runtime, RuntimeHandler, HandlerFn, ClassRef, Injector, RuntimeContext } from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';
/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export declare class ProceedingScope implements Proceeding {
    readonly runtime: Runtime;
    constructor(runtime: Runtime);
    pointcutCtor(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext): any;
    pointcutProperty(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext): any;
    protected createProxy(prefix: string, rootRef: ClassRef, root: any, typeRef: ClassRef | null, instance: any, advisor: Advisor, parent?: Injector): any;
    protected proxy<T>(originMethod: Function, propertyKey: string | symbol, fullName: string, advisor: Advisor, receiver: T, target: any, targetRef: ClassRef, parent?: Injector): (...args: any[]) => any;
    private handle;
}
export declare function getAdvicesLifeScope(runtime: Runtime): RuntimeHandler<JoinPoint, any, RuntimeContext>;
export declare const afterReturningIterceptor: (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => any;
export declare const afterThrowingInterceptor: (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => any;
export declare const beforeIterceptor: (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => RuntimeContext | undefined;
export declare const pointcutIterceptor: (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => RuntimeContext | undefined;
export declare const afterIterceptor: (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => any;
export declare const originMethodHandler: (jp: JoinPoint, context: RuntimeContext) => any;
export declare const adviceHanlder: (jp: JoinPoint, context: RuntimeContext) => any;
