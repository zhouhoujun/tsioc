import {
    tokenId, Injector, IocContext, DefaultInvocationContext, ParameterMetadata, lang, Type,
    DecorDefine, Defer, TargetInvokeArguments, ProvdierOf, isArray, CONTEXT_ARGUMENTS
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends TargetInvokeArguments {
    targetType: Type;
    methodName: string | symbol;
    fullName?: string;
    provJoinpoint?: JoinPoint;
    params?: ParameterMetadata[];
    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinPoint: JoinPoint) => any;
    originMethod?: Function;
    args?: any[];
    valueChange?: { newValue: any, oldValue: any },
    state?: JoinpointState;
    advices: Advices;
    annotations?: DecorDefine[];
    target?: any;
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


    target: any;
    returning: any;
    throwing: any;

    private _fullName: string | undefined;
    readonly targetType: Type;
    readonly advices: Advices;
    readonly originMethod?: Function;
    readonly params?: ParameterMetadata[];
    readonly annotations?: DecorDefine[];
    readonly valueChange?: { newValue: any, oldValue: any };

    public state: JoinpointState;

    constructor(injector: Injector, options: JoinpointOption) {
        super(injector, options);
        this.target = options.target;
        this.targetType = options.targetType;
        this.advices = options.advices;
        this.originProxy = options.originProxy;
        this.originMethod = options.originMethod;
        this.params = options.params;
        this.valueChange = options.valueChange;
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

    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.methodName?.toString()
        }
        return this._fullName
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
