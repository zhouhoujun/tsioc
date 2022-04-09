import {
    Type, tokenId, Injector, Token, IocContext, InvocationContext, DefaultInvocationContext,
    ParameterMetadata, lang, ClassType, DecorDefine, Defer, InvocationOption, EMPTY_OBJ
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends InvocationOption {
    targetType: ClassType;
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
export class Joinpoint<T = any> extends DefaultInvocationContext<T> implements IocContext {
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
    readonly targetType: ClassType;
    readonly advices: Advices;
    readonly originMethod?: Function;
    readonly params?: ParameterMetadata[];
    readonly args?: any[];
    readonly annotations?: DecorDefine[];

    public state: JoinpointState;

    constructor(injector: Injector, options: JoinpointOption) {
        super(injector, options);
        this.target = options.target;
        this.targetType = options.targetType;
        this.advices = options.advices;
        this.originMethod = options.originMethod;
        this.params = options.params;
        this.args = options.args;
        this.annotations = options.annotations;
        this.state = options.state ?? JoinpointState.Before;
    }

    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.methodName;
        }
        return this._fullName;
    }

    protected override isSelf(token: Token) {
        return token === InvocationContext || token === Joinpoint;
    }

    /**
     * parse option to instance of {@link Joinpoint}
     * @param injector 
     * @param options 
     * @returns 
     */
    static override create(injector: Injector, options: JoinpointOption) {
        return new Joinpoint(injector, options);
    }
}
