import {
    Type, MethodMetadata, ClassMetadata, ParameterMetadata, tokenId, Injector, EMPTY, Token, InvocationContext,
    lang, IocContext, ClassType, OperationArgumentResolver, DEFAULT_RESOLVERS, InvokeOption, TokenValue, DecorDefine
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

/**
 * Joinpoint of aop.
 */
export class Joinpoint<T = any> extends InvocationContext<T> implements IocContext {
    invokeHandle!: (joinPoint: Joinpoint, advicer: Advicer) => any;

    /**
     * custom proxy invoke origin method.
     */
    originProxy?: (joinpoint: Joinpoint) => void;

    returning: any;

    throwing: any;

    resetReturning: any;

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
        parent?: InvocationContext,
        data?: T,
        values?: TokenValue[],
        ...argumentResolvers: OperationArgumentResolver[]) {
        super(injector, parent, target, method, data, values, ...argumentResolvers, ...DEFAULT_RESOLVERS);
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
    static parse(injector: Injector, options: JoinpointOption) {
        return new Joinpoint(
            Injector.create([], injector, 'invocation'),
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
            options.parent,
            {
                // method: options.name,
                // params: options.params,
                // args: options.args,
                // advices: options.advices,
                // originMethod: options.originMethod,
                // annotations: options.annotations
            },
            options.values,
            ...options.resolvers || EMPTY)
    }
}
