import { Abstract, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { CodingsContext } from './context';


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
    abstract encode(input: TInput, context?: CodingsContext): Observable<TOutput>;
}
