import { Context, DecodeInterceptor, Decoder, ResponsePacket } from '@tsdi/common';
import { Handler } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable, map } from 'rxjs';


@Injectable()
export class ClientStatusDecorder implements DecodeInterceptor<ResponsePacket> {
    intercept(input: Context, next: Decoder<ResponsePacket>): Observable<ResponsePacket> {
        
        return next.handle(input)
            .pipe(
                map(pack=> {
                    return pack;
                })
            )
        
    }

}
