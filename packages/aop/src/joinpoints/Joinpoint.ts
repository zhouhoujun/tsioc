import {
    Type, MethodMetadata, IParameter, ClassMetadata, IProvider, TypeMetadata, tokenId, Token,
    isNullOrUndefined, IocContext, IInjector, PROVIDERS
} from '@tsdi/ioc';
import { JoinpointState } from './state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';


export interface JoinpointOption {
    provJoinpoint?: Joinpoint;
    name: string;
    fullName: string;
    params: IParameter[];
    originMethod?: Function;
    args: any[];
    state?: JoinpointState;
    advices: Advices;
    annotations?: (ClassMetadata | MethodMetadata)[];
    target?: any;
    targetType: Type;
    providers?: IProvider;
}


export const AOP_METHOD_ANNOTATIONS = tokenId<(ClassMetadata | MethodMetadata)[]>('AOP_METHOD_ANNOTATIONS');


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
     * @memberof Joinpoint
     */
    name: string;

    /**
     * prov joinpoint.
     *
     * @type {IJoinpoint}
     * @memberof Joinpoint
     */
    provJoinpoint: Joinpoint;

    /**
     * full name.
     *
     * @type {string}
     * @memberof Joinpoint
     */
    fullName: string;

    originMethod: Function;

    /**
     * join point state.
     *
     * @type {JoinpointState}
     * @memberof Joinpoint
     */
    state: JoinpointState;

    /**
     * params of pointcut.
     *
     * @type {IParameter[]}
     * @memberof Joinpoint
     */
    params: IParameter[];

    /**
     * args of pointcut.
     *
     * @type {any[]}
     * @memberof Joinpoint
     */
    args: any[];
    /**
     * pointcut returing
     *
     * @type {*}
     * @memberof Joinpoint
     */
    returning: any;

    /**
     * pointcut throwing error.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    throwing: Error;

    /**
     * advicer of joinpoint
     *
     * @type {Advicer}
     * @memberof Joinpoint
     */
    advices: Advices;

    /**
     * orgin pointcut method metadatas.
     *
     * @type {TypeMetadata[]}
     * @memberof Joinpoint
     */
    get annotations(): TypeMetadata[] {
        return this.routeValue(AOP_METHOD_ANNOTATIONS);
    }
    /**
     * set annotations.
     */
    set annotations(meta: TypeMetadata[]) {
        this.providers.setValue(AOP_METHOD_ANNOTATIONS, meta);
    }

    invokeHandle: (joinPoint: Joinpoint, advicer: Advicer) => any;

    /**
     * pointcut target instance
     *
     * @type {*}
     * @memberof Joinpoint
     */
    target: any;

    /**
     * pointcut target type.
     *
     * @type {Type}
     * @memberof Joinpoint
     */
    targetType: Type;

    private pdr: IProvider;
    set providers(pdr: IProvider) {
        this.pdr.inject(pdr);
        // reset
        this.pdr.inject({ provide: Joinpoint, useValue: this });
    }
    get providers(): IProvider {
        return this.pdr;
    }


    constructor(public injector: IInjector) {
        this.pdr = injector.get(PROVIDERS);
        this.pdr.inject({ provide: Joinpoint, useValue: this });
    }

    routeValue<T>(token: Token<T>): T {
        let value: T;
        let currj: Joinpoint = this;
        let key = this.injector.getTokenKey(token);
        while (isNullOrUndefined(value) && currj) {
            value = currj.providers?.get(key);
            currj = currj.provJoinpoint;
        }
        return value;
    }

    getProvProviders(): IProvider[] {
        let pdrs: IProvider[] = [];
        let currj: Joinpoint = this.provJoinpoint;
        while (currj) {
            let pdr = currj.providers;
            if (pdr && pdr.size) {
                pdrs.push(pdr);
            }
            currj = currj.provJoinpoint;
        }
        return pdrs;
    }

    /**
     * create resolve context via options.
     *
     * @static
     * @param {IInjector} injector
     * @param {ResolveActionOption} options
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injector: IInjector, options: JoinpointOption): Joinpoint {
        let jpt = new Joinpoint(injector);
        jpt = Object.assign(jpt, options);
        return jpt;
    }
}
