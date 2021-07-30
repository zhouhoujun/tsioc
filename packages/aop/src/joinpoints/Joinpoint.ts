import {
    Type, MethodMetadata, ClassMetadata, tokenId,
    IocContext, Injector, ParameterMetadata, ProviderType
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';

/**
 * joinpoint option.
 */
export interface JoinpointOption {
    provJoinpoint?: Joinpoint;
    name: string;
    fullName: string;
    params: ParameterMetadata[];
    originMethod?: Function;
    args: any[];
    state?: JoinpointState;
    advices: Advices;
    annotations?: (ClassMetadata | MethodMetadata)[];
    target?: any;
    targetType: Type;
    providers?: ProviderType[];
}


export const AOP_METHOD_ANNOTATIONS = tokenId<any[]>('AOP_METHOD_ANNOTATIONS');


/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
export class Joinpoint implements IocContext {
    /**
     * method name
     *
     * @type {string}
     */
    name: string;

    /**
     * prov joinpoint.
     *
     * @type {IJoinpoint}
     */
    provJoinpoint: Joinpoint;

    /**
     * full name.
     *
     * @type {string}
     */
    fullName: string;

    originMethod: Function;

    /**
     * join point state.
     *
     * @type {JoinpointState}
     */
    state: JoinpointState;

    /**
     * params of pointcut.
     *
     * @type {ParameterMetadata[]}
     */
    params: ParameterMetadata[];

    /**
     * args of pointcut.
     *
     * @type {any[]}
     */
    args: any[];
    /**
     * pointcut origin returing
     *
     * @type {*}
     */
    returning: any;

    /**
     * to reset returning for AfterReturning, Around advice.
     */
    resetReturning?: any;

    /**
     * pointcut throwing error.
     *
     * @type {*}
     */
    throwing: Error;

    /**
     * advicer of joinpoint
     *
     * @type {Advicer}
     */
    advices: Advices;

    /**
     * orgin pointcut method metadatas.
     *
     * @type {any[]}
     */
    get annotations(): any[] {
        return this.injector.get(AOP_METHOD_ANNOTATIONS);
    }
    /**
     * set annotations.
     */
    set annotations(meta: any[]) {
        this.injector.setValue(AOP_METHOD_ANNOTATIONS, meta);
    }

    invokeHandle: (joinPoint: Joinpoint, advicer: Advicer) => any;

    /**
     * pointcut target instance
     *
     * @type {*}
     */
    target: any;

    /**
     * pointcut target type.
     *
     * @type {Type}
     */
    targetType: Type;


    constructor(public injector: Injector) {
    }


    /**
     * create resolve context via options.
     *
     * @static
     * @param {Injector} injector
     * @param {ResolveActionOption} options
     * @returns {ResolveActionContext}
     */
    static parse<T>(injector: Injector, options: JoinpointOption): Joinpoint {
        if(options.providers && options.providers.length){
            injector = Injector.create(options.providers, injector);
        }
        return Object.assign(new Joinpoint(injector), options);
    }
}
