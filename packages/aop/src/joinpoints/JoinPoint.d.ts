import { Injector, ContextInjector, AbstractType, DecorDefine, Defer, TargetInvokeArguments, ClassRef, HandlerFn, Context, Parameters } from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advisor } from '../Advisor';
/**
 * joinpoint option.
 */
export interface JoinpointOption extends TargetInvokeArguments {
    targetRef: ClassRef;
    propertyKey: string | symbol;
    targetType?: AbstractType;
    fullName?: string;
    provJoinpoint?: JoinPoint;
    params?: Parameters;
    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinPoint: JoinPoint) => any;
    originMethod?: Function;
    args?: any[];
    accessor?: 'get' | 'set';
    valueChange?: {
        newValue: any;
        oldValue: any;
    };
    state?: JoinpointState;
    advisor: Advisor;
    annotations?: DecorDefine[];
    /**
     * instance of target type
     */
    target?: any;
    /**
     * target proxy
     */
    receiver?: any;
}
export declare const AOP_METHOD_ANNOTATIONS: import("@tsdi/ioc").InjectToken<any[]>;
export interface ReturnDefer {
    returningDefer: Defer;
}
/**
 * JoinPoint of aop.
 */
export declare class JoinPoint extends ContextInjector {
    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinPoint: JoinPoint) => any;
    /**
     * target proxy
     */
    receiver: any;
    root: any;
    /**
     * instance of target type
     */
    target: any;
    returning: any;
    throwing: any;
    args: any[];
    accessor?: 'get' | 'set' | 'value';
    readonly propertyKey: string | symbol;
    readonly fullName: string;
    readonly targetRef: ClassRef;
    readonly targetType: AbstractType | undefined;
    readonly advisor: Advisor;
    readonly originMethod?: Function;
    readonly params?: Parameters;
    readonly annotations?: DecorDefine[];
    readonly valueChange?: {
        newValue: any;
        oldValue: any;
    };
    state: JoinpointState;
    constructor(injector: Injector, options: JoinpointOption);
    /**
     * parse option to instance of {@link JoinPoint}
     * @param injector
     * @param options
     * @returns
     */
    static create(injector: Injector, options: JoinpointOption): JoinPoint;
}
export declare class ProceedingJoinPoint extends JoinPoint {
    private joinPoint;
    private next;
    private context?;
    constructor(joinPoint: JoinPoint, next: HandlerFn, context?: Context | undefined);
    proceed(...args: any[]): any;
}
