import {
    tokenId, Injector, Token, IocContext, InvocationContext, DefaultInvocationContext,
    ParameterMetadata, lang, Type, DecorDefine, Defer, InvocationOption
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends InvocationOption {
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
