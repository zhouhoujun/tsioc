import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { CodingsContext } from './context';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> {
    /**
     * decode inport
     * @param input 
     */
    abstract decode(input: TInput, context: CodingsContext): Observable<TOutput>;
}
