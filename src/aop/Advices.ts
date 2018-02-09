import { AdviceMetadata } from './metadatas/index';
import { Type } from '../types';
import { MethodMetadata } from '../core/index';
import { IParameter } from '../IParameter';
import { MatchPointcut } from './MatchPointcut';


export interface Advices {
    Pointcut: Advicer[];
    Before: Advicer[];
    After: Advicer[];
    Around: Advicer[];
    AfterThrowing: Advicer[];
    AfterReturning: Advicer[];
}


/**
 * AdviceInvokerData
 *
 * @export
 * @interface Advicer
 */
export interface Advicer extends MatchPointcut {
    /**
     * aspect type.
     *
     * @type {Type<any>}
     * @memberof Advicer
     */
    aspectType: Type<any>;

}
