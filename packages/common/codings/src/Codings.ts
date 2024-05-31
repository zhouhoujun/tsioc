import { Injectable, Type, getClass, getClassName } from '@tsdi/ioc';
import { NotHandleExecption } from '@tsdi/core';
import { Observable, map, mergeMap, of, throwError } from 'rxjs';
import { CodingMappings } from './mappings';
import { CodingType, CodingsContext } from './context';


/**
 * Codings
 */
@Injectable({
    static: true,
    providedIn: 'root'
})
export class Codings {

    constructor(private mappings: CodingMappings) { }

    encode<TOutput = any>(input: any, context: CodingsContext, failed?: (data: any) => Observable<any>): Observable<TOutput> {
        const type = getClass(input);
        return this.encodeType(type, input, context, failed);
    }

    deepEncode<TOutput = any>(input: any, context: CodingsContext, failed?: (data: any) => Observable<any>): Observable<TOutput> {
        return this.encode(input, context, failed)
            .pipe(
                mergeMap(data => {
                    if (context.encodeCompleted) return of(data);
                    return this.encode(data, context, failed)
                })
            )
    }

    encodeType<T>(type: Type<T> | string, data: T, context: CodingsContext, failed?: (data: any) => Observable<any>): Observable<any> {
        const handlers = this.mappings.getEncodeHanlders(type, context.options);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => {
                        if (context.encodeCompleted) return of(i);
                        return curr.handle(i, context.next(i, CodingType.Encode))
                    })
                );
            }, of(data))
        } else {
            if (failed) {
                return failed(data)
                    .pipe(
                        map(d => {
                            if (d === data) {
                                throw new NotHandleExecption(`No encodings handler for ${getClassName(type)} of ${context.options.group} ${context.options.name ?? ''}`);
                            }
                            return d;
                        })
                    )
            }
            return throwError(() => new NotHandleExecption(`No encodings handler for ${getClassName(type)} of ${context.options.group} ${context.options.name ?? ''}`))
        }
    }

    decode<TOutput = any>(input: any, context: CodingsContext, failed?: (data: any) => Observable<any>): Observable<TOutput> {
        const type = getClass(input);
        return this.decodeType(type, input, context, failed)
    }

    deepDecode<TOutput = any>(input: any, context: CodingsContext, failed?: (data: any) => Observable<any>): Observable<TOutput> {
        return this.decode(input, context, failed)
            .pipe(
                mergeMap(data => {
                    if (context.decodeCompleted) return of(data);
                    return this.decode(data, context, failed)
                })
            )
    }

    decodeType<T>(type: Type<T> | string, data: T, context: CodingsContext, failed?: (data: T) => Observable<any>): Observable<any> {
        const handlers = this.mappings.getDecodeHanlders(type, context.options);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => {
                        if (context.encodeCompleted) return of(i);
                        return curr.handle(i, context.next(i, CodingType.Decode))
                    })
                );
            }, of(data))
        } else {
            if (failed) {
                return failed(data)
                    .pipe(
                        map(d => {
                            if (d === data) {
                                throw new NotHandleExecption(`No decodings handler for ${getClassName(type)} of ${context.options.group} ${context.options.name ?? ''}`);
                            }
                            return d;
                        })
                    )
            }
            return throwError(() => new NotHandleExecption(`No decodings handler for ${getClassName(type)} of ${context.options.group} ${context.options.name ?? ''}`))
        }
    }
}
