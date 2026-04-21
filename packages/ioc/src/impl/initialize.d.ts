import { InterceptorFn, InterceptorLike } from '../handlers/interceptor';
import { ClassRef } from '../metadata/class';
import { Runtime } from '../runtime';
import { RuntimeHandler } from '../lifescope/handler';
import { RuntimeContext } from '../lifescope/context';
export declare const runtimeAutorunInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare const runtimeAnnoInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare function getRuntimeClassScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext>;
export declare const cacheInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare const methodInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare function getRuntimeMethodScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext>;
export declare const propertyInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare function getRuntimePropertyScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext>;
/**
 * resolve constructor args action.
 */
export declare const ctorArgsInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>;
export declare const instanceHandler: (typeRef: ClassRef, context: RuntimeContext) => any;
export declare const INITIALIZE_INTERCEPTORS: InterceptorLike<ClassRef>[];
