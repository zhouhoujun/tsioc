import { Injectable, isPromise, isString, tokenId } from '@tsdi/ioc';
import { Observable, from, isObservable, mergeMap, of, throwError } from 'rxjs';
import { DecodeHandler, EncodeHandler } from '../metadata';
import { CodingsContext } from '../context';
import { InvalidJsonException } from '../../execptions';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
import { DecodingsHandler } from '../decodings';
import { Codings } from '../Codings';
import { EncodingsHandler } from '../encodings';
import { Interceptor } from '@tsdi/core';
import { PacketData } from '../../packet';

export const JSON_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('JSON_ENCODE_INTERCEPTORS');

export const JSON_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer, PacketData, CodingsContext>[]>('JSON_DECODE_INTERCEPTORS');

@Injectable()
export class JsonCodingsHandlers {

    @DecodeHandler('JSON', { interceptorsToken: JSON_DECODE_INTERCEPTORS })
    decodeHandle(context: CodingsContext) {
        const input = context.last<string | Buffer>();
        const jsonStr = isString(input) ? input : new TextDecoder().decode(input);
        try {
            const buff = JSON.parse(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => new InvalidJsonException(err, jsonStr));
        }
    }

    @EncodeHandler('JSON', { interceptorsToken: JSON_ENCODE_INTERCEPTORS })
    encode(context: CodingsContext) {
        const input = context.last<any>();
        try {
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => err);
        }
    }
}

@Injectable()
export class JsonifyDecodeInterceptor implements DecodingsHandler {
    constructor(private codings: Codings) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        if (!(isString(input) || isBuffer(input))) return of(input);

        const data = isString(input) ? input : (input.length ? new TextDecoder().decode(input) : '');
        if (!data) return of({});
        return this.codings.decodeType('JSON', data, context);
    }

}

@Injectable()
export class JsonifyEncodeInterceptor implements EncodingsHandler {

    constructor(private codings: Codings, private streamAdapter: StreamAdapter) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        // if (isPromise(input)) return from(input).pipe(mergeMap(v => this.isJson(v) ? this.codings.encodeType('JSON', v, context) : of(v)));
        // if (isObservable(input)) return input.pipe(mergeMap(v => this.isJson(v) ? this.codings.encodeType('JSON', v, context) : of(v)));
        return this.isJson(input) ? this.codings.encodeType('JSON', input, context) : of(input);
    }

    isJson(target: any) {
        if (!this.streamAdapter.isJson(target)) return false;
        return !Object.keys(target).some(k => this.streamAdapter.isStream(target[k]));
    }
}