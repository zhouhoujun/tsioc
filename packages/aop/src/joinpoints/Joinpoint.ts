import { Type, Injectable, MethodMetadata, IParameter, Inject, ClassMetadata, Injector, TypeMetadata, tokenId } from '@tsdi/ioc';
import { IJoinpoint } from './IJoinpoint';
import { JoinpointState } from './JoinpointState';
import { Advicer } from '../advices/Advicer';
import { NonePointcut } from '../decorators/NonePointcut';


export interface JoinpointOption {
    provJoinpoint?: Joinpoint;
    name: string;
    fullName: string;
    params?: IParameter[];
    args?: any[];
    returning?: any;
    throwing?: any;
    state?: JoinpointState;
    advicer?: Advicer;
    annotations?: (ClassMetadata | MethodMetadata)[];
    target: any;
    targetType: Type,
    originProvider?: Injector;
    currProvider?: Injector;
}
export const JoinpointOptionToken = tokenId<IJoinpoint>('Joinpoint-Option');

/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
@Injectable()
@NonePointcut()
export class Joinpoint implements IJoinpoint {
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
    provJoinpoint: IJoinpoint;
    /**
     * full name.
     *
     * @type {string}
     * @memberof Joinpoint
     */
    fullName: string;
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
    returning?: any;

    /**
     * the result value of returing.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    returningValue?: any;

    /**
     * pointcut throwing error.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    throwing?: any;

    /**
     * advicer of joinpoint
     *
     * @type {Advicer}
     * @memberof Joinpoint
     */
    advicer: Advicer;

    /**
     * orgin pointcut method metadatas.
     *
     * @type {TypeMetadata[]}
     * @memberof Joinpoint
     */
    annotations: TypeMetadata[];

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

    /**
     * prvoider map of joinpoint context.
     *
     * @type {Injector}
     * @memberof Joinpoint
     */
    originProvider: Injector;

    currProvider: Injector;


    constructor(@Inject(JoinpointOptionToken) options: JoinpointOption) {
        options = options || {} as JoinpointOption;
        this.provJoinpoint = options.provJoinpoint;
        this.name = options.name;
        this.fullName = options.fullName;
        this.params = options.params || [];
        this.args = options.args;
        this.returning = options.returning;
        this.throwing = options.throwing;
        this.state = options.state;
        this.advicer = options.advicer;
        this.annotations = options.annotations;
        this.target = options.target;
        this.targetType = options.targetType;
        this.originProvider = options.originProvider;
        this.currProvider = options.currProvider;
    }

}
