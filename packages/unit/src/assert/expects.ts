import { token, Token } from '@tsdi/ioc';
import { Matchers } from 'expect';

export interface IAssertMatch<T> extends Matchers<T> { }


export type Expect = (target: any, message?: string | Error) => IAssertMatch<any>;
export const ExpectToken: Token<Expect> = token<Expect>('unit-expect');
