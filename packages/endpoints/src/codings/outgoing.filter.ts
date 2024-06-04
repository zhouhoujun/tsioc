import { Injectable } from '@tsdi/ioc';
import { Filter, Handler } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import { Codings } from '@tsdi/common/codings';
import { Observable, mergeMap } from 'rxjs';
import { RequestContext } from '../RequestContext';



@Injectable()
export class OutgoingEncodeFilter implements Filter<RequestContext, Message> {
    constructor(private codings: Codings) { }

    intercept(input: RequestContext, next: Handler<Packet, Message>, context: any): Observable<Message> {
        return this.codings.encode<Packet>(input, context)
            .pipe(
                mergeMap(pkg => {
                    return  next.handle(pkg, context);
                })
            )
    }

}