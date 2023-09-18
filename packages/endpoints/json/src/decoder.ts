import { InvalidJsonException, Packet } from '@tsdi/common';
import { Decoder } from '@tsdi/common/client';
import { ArgumentExecption, Injectable, isString } from '@tsdi/ioc';
import { Observable, of } from 'rxjs';

@Injectable()
export class JsonDecoder implements Decoder {

    decode(input: Buffer): Observable<Packet<any>> {
        return this.handle(input)
    }
    handle(input: Buffer): Observable<Packet<any>> {
        if (!input) throw new ArgumentExecption('json decoding input empty');
        const jsonStr = isString(input) ? input : new TextDecoder().decode(input) ;
        try {
            return of(JSON.parse(jsonStr));
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }
    
}