import {
    Type, MethodMetadata, ClassMetadata, ParameterMetadata, tokenId, Injector, EMPTY, Token,
    lang, IocContext, InvocationContext, ClassType, OperationArgumentResolver, DEFAULT_RESOLVERS, InvokeOption, TokenValue
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption extends InvokeOption {
    name: string;
    provJoinpoint?: Joinpoint;
    params?: ParameterMetadata[];
    originMethod?: Function;
    args?: any[];
    state?: JoinpointState;
    advices: Advices;
    annotations?: (ClassMetadata | MethodMetadata)[];
    target?: any;
    targetType: Type;
}


export const AOP_METHOD_ANNOTATIONS = tokenId<any[]>('AOP_METHOD_ANNOTATIONS');


export class Joinpoint<T = any> extends InvocationContext<T> implements IocContext {
    invokeHandle!: (joinPoint: Joinpoint, advicer: Advicer) => any;

    returning: any;

    throwing: any;

    resetReturning: any;

    constructor(
        injector: Injector,
        readonly target: any,
        readonly targetType: ClassType,
        readonly method: string,
        public state: JoinpointState,
        readonly advices: Advices,
        readonly originMethod?: Function,
        readonly args?: any[],
        readonly annotations?: any[],
        readonly params?: ParameterMetadata[],
        parent?: InvocationContext,
        readonly provJoinpoint?: Joinpoint, data?: T, values?: TokenValue[], ...argumentResolvers: OperationArgumentResolver[]) {
        super(injector, parent, target, method, data, values, ...argumentResolvers, ...DEFAULT_RESOLVERS);
    }

    private _fullName!: string
    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.method;
        }
        return this._fullName;
    }

    protected override isSelf(token: Token) {
        return token === InvocationContext || token === Joinpoint;
    }

    static parse(injector: Injector, options: JoinpointOption) {
        return new Joinpoint(injector,
            options.target,
            options.targetType,
            options.name,
            options.state ?? JoinpointState.Before,
            options.advices,
            options.originMethod,
            options.args,
            options.params,
            options.annotations,
            options.parent,
            options.provJoinpoint,
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
