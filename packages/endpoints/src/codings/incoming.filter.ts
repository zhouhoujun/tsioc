import { Injectable } from '@tsdi/ioc';
import { Filter, Handler } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import { Codings } from '@tsdi/common/codings';
import { RequestContext } from '../RequestContext';
import { Observable, mergeMap } from 'rxjs';



@Injectable()
export class IncomingDecodeFilter implements Filter<Message, RequestContext> {
    constructor(private codings: Codings) { }

    intercept(input: Message, next: Handler<Message, Packet>, context: any): Observable<RequestContext> {
        return next.handle(input, context)
            .pipe(
                mergeMap(pkg => {
                    return this.codings.decode(pkg, context) as Observable<RequestContext>;
                })
            )
    }

}