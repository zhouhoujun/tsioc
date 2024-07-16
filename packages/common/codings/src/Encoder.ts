import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> {
    /**
     * encode inport
     * @param input 
     */
    abstract encode(input: TInput, context?: any): Observable<TOutput>;
}
