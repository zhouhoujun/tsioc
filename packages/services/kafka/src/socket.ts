import { BadRequestExecption, TransportContext } from '@tsdi/common/transport';
import { ContextToken } from '@tsdi/core';
import { Consumer, Producer, ConsumerSubscribeTopics, ConsumerRunConfig, EachMessagePayload, CompressionTypes } from 'kafkajs';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';


export const KAFKA_MESSAGE = new ContextToken<EachMessagePayload>(() => null!);

export class KafkaSocket {

    private regTopics?: RegExp[];
    private subj$ = new BehaviorSubject<EachMessagePayload>(null!);
    constructor(readonly consumer: Consumer, readonly producer: Producer, private runOptions: ConsumerRunConfig) {

    }

    async subscribe(topics: (string | RegExp)[], options: Omit<ConsumerSubscribeTopics, 'topics'>) {
        const consumer = this.consumer;
        await consumer.subscribe({
            topics,
            ...options,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        const originEach = this.runOptions?.eachMessage;
        await consumer.run({
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

    getPacket(factory: ()=> TransportContext, filterFn: (msg: EachMessagePayload) => boolean, instance?: TransportContext): Observable<TransportContext> {
        return this.subj$.pipe(
            filter(r => !!r && filterFn(r)),
            map(r => {
                const context = instance ?? factory();
                context.set(KAFKA_MESSAGE, r);
                context.incoming= r.message.value;
                return context
            })
        )
    }

    async publish(topic: string, payload: Buffer | null, options?: {
          acks?: number
          timeout?: number
          compression?: CompressionTypes
    }) {

        if (!topic) throw new BadRequestExecption();

        this.producer.send({
            topic,
            ...options,
            messages: [
                {
                    value: payload ?? Buffer.alloc(0),
                    // options
                }
            ]
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