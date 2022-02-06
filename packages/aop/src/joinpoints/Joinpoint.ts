import {
    Type, ParameterMetadata, tokenId, Injector, Token, IocContext, InvocationContext, DefaultInvocationContext,
    lang, ClassType, InvokeOption, DecorDefine, Defer, InvocationOption, EMPTY_OBJ
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends InvokeOption {
    name: string;
    fullName?: string;
    provJoinpoint?: Joinpoint;
    params?: ParameterMetadata[];
    originMethod?: Function;
    args?: any[];
    state?: JoinpointState;
    advices: Advices;
    annotations?: DecorDefine[];
    target?: any;
    targetType: Type;
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

    constructor(
        injector: Injector,
        readonly target: any,
        readonly targetType: ClassType,
        readonly method: string,
        private _fullName: string | undefined,
        public state: JoinpointState,
        readonly advices: Advices,
        readonly originMethod?: Function,
        readonly params?: ParameterMetadata[],
        readonly args?: any[],
        readonly annotations?: DecorDefine[],
        options: InvocationOption = EMPTY_OBJ) {
        super(injector, options);
    }

    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.method;
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
        return new Joinpoint(injector,
            options.target,
            options.targetType,
            options.name,
            options.fullName,
            options.state ?? JoinpointState.Before,
            options.advices,
            options.originMethod,
            options.params,
            options.args,
            options.annotations,
            {
                ...options,
                invokerMethod: options.name,
                invokerTarget: options.targetType
            })
    }
}
