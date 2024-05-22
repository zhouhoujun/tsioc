import { Injectable, getClass, isPrimitive } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { CodingMappings } from '@tsdi/common/codings';
import { Observable, mergeMap, of } from 'rxjs';
import { TransportContext } from '../context';


@Injectable()
export class TypedEncodeInterceper implements Interceptor<any, any, TransportContext> {

    constructor(private mappings: CodingMappings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        const type = getClass(input);
        const handlers = isPrimitive(type) ? null : this.mappings.getEncodeHanlders(type, context.options);
        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => curr.handle(i, context.next(i)))
                );
            }, of(input))
        } else {
            return next.handle(input, context)
        }

    }
}


@Injectable()
export class TypedDecodeInterceper implements Interceptor<any, any, TransportContext> {

    constructor(private mappings: CodingMappings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        const type = getClass(input);
        const handlers = isPrimitive(type) ? null : this.mappings.getDecodeHanlders(type, context.options);
        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => curr.handle(i, context.next(i)))
                );
            }, of(input))
        } else {
            return next.handle(input, context)
        }

    }
}
