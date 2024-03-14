import { Abstract } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable } from 'rxjs';



/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> {
    /**
     * the method hande decode, with implemet encode interceptor.
     * 加密处理器。
     */
    abstract get handler(): Handler<TInput, TOutput>;
    /**
     * encode inport
     * @param input 
     */
    encode(input: TInput): Observable<TOutput> {
        return this.handler.handle(input);
    }
}

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> {
    /**
     * the method hande decode, with implemet decode interceptor.
     * 解密处理器
     */
    abstract get handler(): Handler<TInput, TOutput>;
    /**
     * decode inport
     * @param input 
     */
    decode(input: TInput): Observable<TOutput> {
        return this.handler.handle(input)
    }
}

