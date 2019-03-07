import { InjectToken } from '@ts-ioc/ioc';
import { Expectation } from 'expect';

export interface IAssertMatch<T> extends Expectation<T> {

}


export type Expect = (target: any, message?: string | Error) => IAssertMatch<any>;
export const ExpectToken = new InjectToken<Expect>('unit-expect');
