import { Abstract, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> {


    abstract get defaultMaps(): Map<Type | string, Type | string>;
    /**
     * encode inport
     * @param input 
     */
    abstract encode(input: TInput, context?: any): Observable<TOutput>;
}
