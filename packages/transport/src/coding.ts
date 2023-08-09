import { Interceptor, Handler, Backend } from '@tsdi/core';
import { Abstract, Injectable, isString, tokenId } from '@tsdi/ioc';
import { NotSupportedExecption } from '@tsdi/common';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { isBuffer } from './utils';


@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    abstract handle(input: TInput): Observable<TOutput>;

    encode(input: TInput): Promise<TOutput> {
        return lastValueFrom(this.handle(input));
    }
}

@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    abstract handle(input: TInput): Observable<TOutput>;

    decode(input: TInput): Promise<TOutput> {
        return lastValueFrom(this.handle(input));
    }
}


@Injectable()
export class JsonEncoder implements Backend {

    handle(input: any): Observable<any> {
        if (isBuffer(input) || isString(input)) return throwError(() => new NotSupportedExecption())
        try {
            const json = JSON.stringify(input);
            return of(json);
        } catch (err) {
            return throwError(() => err);
        }
    }

}

@Injectable()
export class JsonDecoder implements Backend {

    handle(input: any): Observable<any> {
        if (isBuffer(input)) {
            input = new TextDecoder().decode(input);
        }
        try {
            const json = JSON.parse(input);
            return of(json);
        } catch (err) {
            return throwError(() => err);
        }
    }

}



export const ENCODERS = tokenId<Interceptor[]>('ENCODERS');

export const DECODERS = tokenId<Interceptor[]>('DECODERS');