import {
    tokenId, Injector, IocContext, DefaultInvocationContext, ParameterMetadata, lang, Type,
    DecorDefine, Defer, TargetInvokeArguments, ProvdierOf, isArray, CONTEXT_ARGUMENTS,
    Class
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advisor } from '../Advisor';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends TargetInvokeArguments {
    targetRef: Class;
    propertyKey: string | symbol;
    targetType?: Type;   
    fullName?: string;
    provJoinpoint?: JoinPoint;
    params?: ParameterMetadata[];
    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinPoint: JoinPoint) => any;
    originMethod?: Function;
    args?: any[];
    accessor?: 'get' | 'set';
    valueChange?: { newValue: any, oldValue: any },
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


export const AOP_METHOD_ANNOTATIONS = tokenId<any[]>('AOP_METHOD_ANNOTATIONS');

export interface ReturnDefer {
    returningDefer: Defer;
}

/**
 * JoinPoint of aop.
 */
export class JoinPoint extends DefaultInvocationContext<any[]> implements IocContext {

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
    accessor?: 'get' | 'set' | 'value';
    readonly propertyKey: string | symbol;
    readonly fullName: string;
    readonly targetRef: Class;
    readonly targetType: Type | undefined;
    readonly advisor: Advisor;
    readonly originMethod?: Function;
    readonly params?: ParameterMetadata[];
    readonly annotations?: DecorDefine[];
    readonly valueChange?: { newValue: any, oldValue: any };

    public state: JoinpointState;

    constructor(injector: Injector, options: JoinpointOption) {
        super(injector, options);
        this.target = options.target;
        this.propertyKey = options.propertyKey;
        this.receiver = options.receiver;
        this.targetRef = options.targetRef;
        this.targetType = options.targetType ?? options.targetRef.type;
        this.fullName = options.fullName ?? lang.getClassName(this.targetType) + '.' + this.propertyKey?.toString();
        this.advisor = options.advisor;
        this.originProxy = options.originProxy;
        this.originMethod = options.originMethod;
        this.params = options.params;
        this.valueChange = options.valueChange;
        this.accessor = options.accessor;
        this.annotations = options.annotations;
        this.state = options.state ?? JoinpointState.Before;
    }

    protected override initArgs(args: ProvdierOf<any[]>): void {
        if (isArray(args)) {
            this._args = args;
            this.injector.setValue(CONTEXT_ARGUMENTS, args);
        } else {
            super.initArgs(args);
        }
    }

    /**
     * parse option to instance of {@link JoinPoint}
     * @param injector 
     * @param options 
     * @returns 
     */
    static create(injector: Injector, options: JoinpointOption) {
        return new JoinPoint(injector, options)
    }
}
