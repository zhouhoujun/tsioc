import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { CodingsContext } from './context';


/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> {
    /**
     * encode inport
     * @param input 
     */
    abstract encode(input: TInput, context: CodingsContext): Observable<TOutput>;
}
