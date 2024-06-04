import { Injectable } from '@tsdi/ioc';
import { Filter, Handler } from '@tsdi/core';
import { Message, Packet, ResponseEvent } from '@tsdi/common';
import { Codings } from '@tsdi/common/codings';
import { Observable, mergeMap } from 'rxjs';



@Injectable()
export class ClientIncomingDecodeFilter implements Filter<Message, ResponseEvent> {
    constructor(private codings: Codings) { }

    intercept(input: Message, next: Handler<Message, Packet>, context: any): Observable<ResponseEvent> {
        return next.handle(input, context)
            .pipe(
                mergeMap(pkg => {
                    return this.codings.decode(pkg, context) as Observable<ResponseEvent>;
                })
            )
    }

}