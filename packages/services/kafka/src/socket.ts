import { ContextToken, isArray, isNumber, isString } from '@tsdi/ioc';
import { isBuffer, BadRequestException, TransportContext } from '@tsdi/common/transport';
import { Consumer, Producer, ConsumerSubscribeTopics, ConsumerRunConfig, EachMessagePayload, Message, ProducerRecord } from 'kafkajs';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';


export const KAFKA_MESSAGE = new ContextToken<EachMessagePayload>(() => null!);

export class KafkaSocket {

    private regTopics?: RegExp[];
    private subj$ = new BehaviorSubject<EachMessagePayload>(null!);
    constructor(readonly consumer: Consumer | null, readonly producer: Producer, private runOptions: ConsumerRunConfig) {

    }

    async subscribe(topics: (string | RegExp)[], options: Omit<ConsumerSubscribeTopics, 'topics'>) {
        if (!this.consumer) {
            return;
        }

        try {
            await this.consumer.subscribe({
                topics,
                ...options,
            });

        } catch (err) {
            console.error(err);
            throw err;
        }

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        const originEach = this.runOptions?.eachMessage;
        await this.consumer.run({
            ...this.runOptions,
            eachMessage: async (payload) => {
                if (originEach) await originEach(payload);
                this.subj$.next(payload);
            }

        });

    }

    getMessage() {
        return this.subj$.pipe(filter(r => !!r))
    }

    getPacket(factory: () => TransportContext, filterFn: (msg: EachMessagePayload) => boolean, instance?: TransportContext): Observable<TransportContext> {
        return this.subj$.pipe(
            filter(r => !!r && filterFn(r)),
            map(r => {
                const context = instance ?? factory();
                context.set(KAFKA_MESSAGE, r);
                context.incoming = r.message.value;
                return context
            })
        )
    }

    async publish(topic: string, messages: Message[], options?: Omit<ProducerRecord, 'topic' | 'messages'>) {

        if (!topic) throw new BadRequestException();

        this.producer.send({
            ...options,
            topic,
            messages
        })
    }


    async disconnect() {
        if (this.consumer) {
            await this.consumer.disconnect()
        }
        if (this.producer) {
            await this.producer.disconnect();
        }
    }
}


export function parseHead(val: Buffer | string | (Buffer | string)[] | undefined): string | string[] | undefined {
    if (isString(val)) return val;
    if (isBuffer(val)) return val.toString();
    if (isArray(val)) return val.map(v => isString(v) ? v : v.toString());
    return `${val}`;
}

export function generHead(head: string | number | readonly string[] | undefined | null): Buffer | string | (Buffer | string)[] | undefined {
    if (isNumber(head)) return Buffer.from(head.toString());
    if (isArray(head)) return head.map(v => v.toString())
    return Buffer.from(`${head}`);
}