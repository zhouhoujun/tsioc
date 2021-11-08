import {
    Type, MethodMetadata, ClassMetadata, ParameterMetadata, tokenId, Injector,
    lang, IocContext, InvocationContext, ClassType, OperationArgumentResolver, EMPTY
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption {
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
    resolvers?: OperationArgumentResolver[];
    context?: InvocationContext;
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
        readonly provJoinpoint?: Joinpoint, data?: T, ...argumentResolvers: OperationArgumentResolver[]) {
        super(injector, parent, target, method, data, ...argumentResolvers);
    }

    private _fullName!: string
    get fullName(): string {
        if (!this._fullName) {
            this._fullName = lang.getClassName(this.targetType) + '.' + this.method;
        }
        return this._fullName;
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
            options.context,
            options.provJoinpoint,
            {
                method: options.name,
                params: options.params,
                args: options.args,
                advices: options.advices,
                originMethod: options.originMethod,
                annotations: options.annotations
            },
            ...options.resolvers || EMPTY)
    }
}

// /**
//  * Join point data.
//  *
//  * @export
//  * @class Joinpoint
//  * @implements {IJoinpoint}
//  */
// export class Joinpoint1 implements IocContext {

//     injector: Injector;
//     /**
//      * method name
//      *
//      * @type {string}
//      */
//     name!: string;

//     /**
//      * prov joinpoint.
//      *
//      * @type {IJoinpoint}
//      */
//     provJoinpoint!: Joinpoint;

//     /**
//      * full name.
//      *
//      * @type {string}
//      */
//     fullName!: string;

//     originMethod!: Function;

//     /**
//      * join point state.
//      *
//      * @type {JoinpointState}
//      */
//     state!: JoinpointState;

//     /**
//      * params of pointcut.
//      *
//      * @type {ParameterMetadata[]}
//      */
//     params!: ParameterMetadata[];

//     /**
//      * args of pointcut.
//      *
//      * @type {any[]}
//      */
//     args!: any[];
//     /**
//      * pointcut origin returing
//      *
//      * @type {*}
//      */
//     returning: any;

//     /**
//      * to reset returning for AfterReturning, Around advice.
//      */
//     resetReturning?: any;

//     /**
//      * pointcut throwing error.
//      *
//      * @type {*}
//      */
//     throwing!: Error;

//     /**
//      * advicer of joinpoint
//      *
//      * @type {Advicer}
//      */
//     advices!: Advices;

//     /**
//      * orgin pointcut method metadatas.
//      *
//      * @type {any[]}
//      */
//     get annotations(): any[] {
//         return this.injector.get(AOP_METHOD_ANNOTATIONS);
//     }
//     /**
//      * set annotations.
//      */
//     set annotations(meta: any[]) {
//         this.injector.setValue(AOP_METHOD_ANNOTATIONS, meta);
//     }

//     invokeHandle!: (joinPoint: Joinpoint, advicer: Advicer) => any;

//     /**
//      * pointcut target instance
//      *
//      * @type {*}
//      */
//     target: any;

//     /**
//      * pointcut target type.
//      *
//      * @type {Type}
//      */
//     targetType!: Type;

//     get providers(): Injector {
//         return this.injector;
//     }


//     constructor(injector: Injector, ...providers: ProviderType[]) {
//         this.injector = Injector.create([...providers, { provide: Joinpoint, useValue: this }], injector, 'provider')
//     }


//     /**
//      * create resolve context via options.
//      *
//      * @static
//      * @param {Injector} injector
//      * @param {ResolveActionOption} options
//      * @returns {ResolveActionContext}
//      */
//     static parse<T>(injector: Injector, options: JoinpointOption): Joinpoint {
//         return lang.assign(new Joinpoint(injector, options.providers, options.provJoinpoint?.providers), options, 'providers', 'injector');
//     }
// }
