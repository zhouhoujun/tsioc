import { Abstract, OnDestroy } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { AbstractTransportSession } from '../TransportSession';



export class CodingsContext implements OnDestroy {

    private _inputs: any[];
    get inputs(): any[] {
        return this._inputs;
    }

    constructor(readonly session: AbstractTransportSession) {
        this._inputs = [];
    }

    get options() {
        return this.session.options
    }

    next<TInput>(input: TInput): this {
        if (this._inputs[0] != input) {
            this._inputs.unshift(input);
        }
        return this;
    }

    first<TInput>(): TInput {
        return this._inputs[this._inputs.length - 1]
    }

    last<TInput>(): TInput {
        return this._inputs[0];
    }

    onDestroy(): void {
        this._inputs = [];
    }

}


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
