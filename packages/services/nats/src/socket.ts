import { HeadersLike, IHeaders } from '@tsdi/common';
import { BadRequestExecption, Packet, TransportContext } from '@tsdi/common/transport';
import { ContextToken } from '@tsdi/core';
import { isFunction } from '@tsdi/ioc';
import { Msg, MsgHdrs, NatsConnection, Payload, PublishOptions, Subscription, SubscriptionOptions, headers as createHeaders } from 'nats';
import { Observable, BehaviorSubject, filter, map } from 'rxjs';


export const NATS_MESSAGE = new ContextToken<Msg>(() => null!);

export class NatsSocket {

    private subscribes: Subscription[] | null = null;
    private subj$ = new BehaviorSubject<Msg>(null!);
    constructor(readonly conn: NatsConnection) { }

    subscribe(topic: string, options?: SubscriptionOptions): Subscription | undefined {
        if (!topic || this.conn.isClosed()) return;
        if (!this.subscribes) this.subscribes = [];
        if (this.subscribes.some(s => s.getSubject() == topic)) return;
        const sub = this.conn.subscribe(topic, options);
        this.resp(sub);
        return sub;
    }

    getMessage() {
        return this.subj$.pipe(filter(r => !!r))
    }

    getPacket(factory: () => TransportContext, filterFn: (msg: Msg) => boolean, instance?: TransportContext): Observable<TransportContext> {
        return this.subj$.pipe(
            filter(r => !!r && filterFn(r)),
            map(r => {
                const context = instance ?? factory()
                context.set(NATS_MESSAGE, r);
                context.incoming =  Buffer.from(r.data);
                return context;
            })
        )
    }

    async publish(topic: string, payload: Payload | null, options?: PublishOptions) {

        if (!topic) throw new BadRequestExecption();

        this.conn.publish(
            topic,
            payload ?? Buffer.alloc(0),
            options
        )
    }

    public mergeHeaders(hdrs: HeadersLike, msgHdrs?: MsgHdrs): MsgHdrs {
        const headers = createHeaders();
        msgHdrs?.keys().forEach(k => {
            headers.set(k, msgHdrs?.get(k) ?? '')
        });
        const hdmap = isFunction(hdrs.getHeaders) ? hdrs.getHeaders() : hdrs as IHeaders;
        Object.keys(hdmap).forEach(k => {
            headers.set(k, String(hdmap[k] ?? ''))
        });
        return headers;
    }

    unsubscribe() {
        this.subscribes?.forEach(s => s?.unsubscribe());
        this.subscribes = null;
    }

    close() {
        this.unsubscribe();
        return this.conn.close()
    }

    private async resp(subs: Subscription) {
        this.subscribes?.push(subs);
        for await (const value of subs) {
            this.subj$.next(value);
        }
    }



}