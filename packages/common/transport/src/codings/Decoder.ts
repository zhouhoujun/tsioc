import { Abstract } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsContext } from './context';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> {
    /**
     * the method hande decode, with implemet decode interceptor.
     * 解密处理器
     */
    abstract get handler(): Handler<TInput, TOutput, CodingsContext>;
    /**
     * decode inport
     * @param input 
     */
    decode(input: TInput, context: CodingsContext): Observable<TOutput> {
        return this.handler.handle(input, context);
    }
}