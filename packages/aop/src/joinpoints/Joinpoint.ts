import {
    tokenId, Injector, IocContext, DefaultInvocationContext, ParameterMetadata, lang, Type,
    DecorDefine, Defer, TargetInvokeArguments, ProvdierOf, isArray, CONTEXT_ARGUMENTS
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends TargetInvokeArguments {
    targetType: Type;
    methodName: string;
    fullName?: string;
    provJoinpoint?: Joinpoint;
    params?: ParameterMetadata[];
    originMethod?: Function;
    args?: any[];
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
 * Joinpoint of aop.
 */
export class Joinpoint extends DefaultInvocationContext<any[]> implements IocContext {
    invokeHandle!: (joinPoint: Joinpoint, advicer: Advicer, sync?: boolean) => any;

    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinpoint: Joinpoint) => any;

    readonly originReturning: any;
    returningDefer?: Defer;
    returning: any;

    throwing: any;


    private _fullName: string | undefined;

    readonly target: any;
    readonly targetType: Type;
    readonly advices: Advices;
    readonly originMethod?: Function;
    readonly params?: ParameterMetadata[];
    readonly annotations?: DecorDefine[];

    public state: JoinpointState;

    constructor(injector: Injector, options: JoinpointOption) {
        super(injector, options);
        this.target = options.target;
        this.targetType = options.targetType;
        this.advices = options.advices;
        this.originMethod = options.originMethod;
        this.params = options.params;
        this.annotations = options.annotations;
        this.state = options.state ?? JoinpointState.Before;
    }
    
    protected override initArgs(args: ProvdierOf<any[]>): void {
        if(isArray(args)) {
            this._args = args;
            this.injector.setValue(CONTEXT_ARGUMENTS, args);
        } else {
            super.initArgs(args);
        }
    }

    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.methodName
        }
        return this._fullName
    }

    /**
     * parse option to instance of {@link Joinpoint}
     * @param injector 
     * @param options 
     * @returns 
     */
    static create(injector: Injector, options: JoinpointOption) {
        return new Joinpoint(injector, options)
    }
}
