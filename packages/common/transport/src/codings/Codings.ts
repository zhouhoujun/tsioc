import { Injectable, getClass, getClassName } from '@tsdi/ioc';
import { mergeMap, of, throwError } from 'rxjs';
import { NotSupportedExecption } from '../execptions';
import { CodingMappings } from './mappings';
import { CodingsContext } from './context';


@Injectable({
    static: true,
    providedIn: 'root'
})
export class Codings {

    constructor(private mappings: CodingMappings) { }

    encode<T>(input: T, context: CodingsContext): any {
        const type = getClass(input);
        const handlers = this.mappings.getEncodeHanlders(type, context.options);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption(`No encodings handler for ${getClassName(type)} of ${context.options.transport}${context.options.microservice ? ' microservice' : ''}${context.options.client ? ' client' : ''}`))
        }
    }

    decode<T>(input: T, context: CodingsContext): any {
        const type = getClass(input);
        const handlers = this.mappings.getDecodeHanlders(type, context.options);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption(`No decodings handler for ${getClassName(type)} of ${context.options.transport}${context.options.microservice ? ' microservice' : ''}${context.options.client ? ' client' : ''}`))
        }
    }
}
