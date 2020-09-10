import {
    Type, MethodMetadata, IParameter, ClassMetadata, IProvider, TypeMetadata, tokenId, Token,
    isNullOrUndefined, IocContext, ActCtxOption, IInjector, createContext, PROVIDERS, TokenId
} from '@tsdi/ioc';
import { JoinpointState } from './JoinpointState';
import { Advices } from '../advices/Advices';


export interface JoinpointOption extends ActCtxOption {
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

export const AOP_METHOD_NAME: TokenId<string> = tokenId<string>('AOP_METHOD_NAME');
export const AOP_METHOD_FULLNAME = tokenId<string>('AOP_METHOD_FULLNAME');
export const AOP_METHOD_ORIGIN = tokenId<Function>('AOP_METHOD_ORIGIN');
export const AOP_METHOD_PARAMS = tokenId<IParameter[]>('AOP_METHOD_PARAMS');
export const AOP_METHOD_ANNOTATIONS = tokenId<(ClassMetadata | MethodMetadata)[]>('AOP_METHOD_ANNOTATIONS');
export const AOP_METHOD_PROVIDERS = tokenId<IProvider>('AOP_METHOD_PROVIDERS');
export const AOP_PROV_JOINPOINT = tokenId<Joinpoint>('AOP_PROV_JOINPOINT');
export const AOP_ARGS = tokenId<any[]>('AOP_ARGS');
export const AOP_TARGET = tokenId<any>('AOP_TARGET');
export const AOP_TARGET_TYPE = tokenId<Type>('AOP_TARGET_TYPE');
export const AOP_RETURNING = tokenId<any>('AOP_RETURNING');
export const AOP_THROWING = tokenId<Error>('AOP_THROWING');
export const AOP_STATE = tokenId<JoinpointState>('AOP_STATE');
export const AOP_ADVICES = tokenId<Advices>('AOP_ADVICES');


/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
export class Joinpoint extends IocContext {
    /**
     * method name
     *
     * @type {string}
     * @memberof Joinpoint
     */
    get name(): string {
        return this.getValue(AOP_METHOD_NAME);
    }

    /**
     * prov joinpoint.
     *
     * @type {IJoinpoint}
     * @memberof Joinpoint
     */
    get provJoinpoint(): Joinpoint {
        return this.getValue(AOP_PROV_JOINPOINT);
    }

    routeValue<T>(token: Token<T>): T {
        let value: T;
        let currj: Joinpoint = this;
        let key = this.injector.getTokenKey(token);
        while (isNullOrUndefined(value) && currj) {
            value = currj.getValue(key);
            currj = currj.provJoinpoint;
        }
        return value;
    }

    /**
     * full name.
     *
     * @type {string}
     * @memberof Joinpoint
     */
    get fullName(): string {
        return this.getValue(AOP_METHOD_FULLNAME);
    }

    get originMethod(): Function {
        return this.getValue(AOP_METHOD_ORIGIN);
    }

    /**
     * join point state.
     *
     * @type {JoinpointState}
     * @memberof Joinpoint
     */
    get state(): JoinpointState {
        return this.getValue(AOP_STATE);
    }

    /**
     * params of pointcut.
     *
     * @type {IParameter[]}
     * @memberof Joinpoint
     */
    get params(): IParameter[] {
        return this.getValue(AOP_METHOD_PARAMS);
    }

    /**
     * args of pointcut.
     *
     * @type {any[]}
     * @memberof Joinpoint
     */
    get args(): any[] {
        return this.getValue(AOP_ARGS) ?? [];
    }
    /**
     * pointcut returing
     *
     * @type {*}
     * @memberof Joinpoint
     */
    get returning(): any {
        return this.getValue(AOP_RETURNING);
    }

    /**
     * pointcut throwing error.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    get throwing(): Error {
        return this.getValue(AOP_THROWING);
    }

    /**
     * advicer of joinpoint
     *
     * @type {Advicer}
     * @memberof Joinpoint
     */
    get advices(): Advices {
        return this.getValue(AOP_ADVICES);
    }

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
     * pointcut target instance
     *
     * @type {*}
     * @memberof Joinpoint
     */
    get target(): any {
        return this.getValue(AOP_TARGET);
    }

    /**
     * pointcut target type.
     *
     * @type {Type}
     * @memberof Joinpoint
     */
    get targetType(): Type {
        return this.getValue(AOP_TARGET_TYPE);
    }

    get providers(): IProvider {
        if (!this.hasValue(AOP_METHOD_PROVIDERS)) {
            this.setValue(AOP_METHOD_PROVIDERS, this.injector.getInstance(PROVIDERS));
        }
        return this.getValue(AOP_METHOD_PROVIDERS)
    }

    getProvProviders(): IProvider[] {
        let pdrs: IProvider[] = [];
        let currj: Joinpoint = this.provJoinpoint;
        while (currj) {
            let pdr = currj.hasValue(AOP_METHOD_PROVIDERS) ? currj.providers : null;
            if (pdr && pdr.size) {
                pdrs.push(pdr);
            }
            currj = currj.provJoinpoint;
        }
        return pdrs;
    }

    setOptions(options: JoinpointOption) {
        if (!options) {
            return this;
        }
        super.setOptions(options);
        this.setValue(AOP_TARGET_TYPE, options.targetType);
        options.target && this.setValue(AOP_TARGET, options.target)
        options.originMethod && this.setValue(AOP_METHOD_ORIGIN, options.originMethod);
        this.setValue(AOP_METHOD_NAME, options.name);
        this.setValue(AOP_METHOD_FULLNAME, options.fullName);
        this.setValue(AOP_METHOD_PARAMS, options.params);
        this.setValue(AOP_ARGS, options.args);
        this.setValue(AOP_ADVICES, options.advices);
        options.state && this.setValue(AOP_STATE, options.state);
        options.providers && this.setValue(AOP_METHOD_PROVIDERS, options.providers);
        options.annotations && this.setValue(AOP_METHOD_ANNOTATIONS, options.annotations);
        options.provJoinpoint && this.setValue(AOP_PROV_JOINPOINT, options.provJoinpoint);
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
        return createContext<Joinpoint>(injector, Joinpoint, options);
    }
}
