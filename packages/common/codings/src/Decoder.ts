import { Abstract, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> {

    abstract get defaultMaps(): Map<Type | string, Type | string>;
    /**
     * decode inport
     * @param input 
     */
    abstract decode(input: TInput, context?: any): Observable<TOutput>;
}
