import { Abstract } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsContext } from './context';


/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> {
    /**
     * the method hande decode, with implemet encode interceptor.
     * 加密处理器。
     */
    abstract get handler(): Handler<TInput, TOutput, CodingsContext>;
    /**
     * encode inport
     * @param input 
     */
    encode(input: TInput, context: CodingsContext): Observable<TOutput> {
        return this.handler.handle(input, context);
    }
}
