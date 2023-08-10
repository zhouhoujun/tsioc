import { Interceptor, Handler, Backend } from '@tsdi/core';
import { Abstract, Injectable, isString, tokenId } from '@tsdi/ioc';
import { NotSupportedExecption, Packet } from '@tsdi/common';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { isBuffer } from './utils';


@Abstract()
export abstract class Encoder {

    abstract handle(input: Packet): Buffer;

    encode(input: Packet): Buffer {
        return this.handle(input);
    }
}

@Abstract()
export abstract class Decoder {

    abstract handle(input: Buffer): Packet;

    decode(input: Buffer): Packet {
        return this.handle(input);
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