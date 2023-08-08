import { Interceptor, Handler } from '@tsdi/core';
import { Abstract, Injectable, tokenId } from '@tsdi/ioc';
import { Observable, lastValueFrom } from 'rxjs';
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


// @Injectable()
// export class JsonEncoder extends Encoder {

//     handle(input: any): Observable<any> {

//         if(isBuffer(input)){
//              new TextDecoder().decode(input);
//         }
//     }

// }


export const ENCODERS = tokenId<Interceptor[]>('ENCODERS');

export const DECODERS = tokenId<Interceptor[]>('DECODERS');