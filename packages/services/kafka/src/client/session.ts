import { Encoder, Decoder, TransportRequest } from '@tsdi/common';
import { ClientTransportSession } from '@tsdi/common/client';
import { TransportOpts, ev } from '@tsdi/common/transport';
import { Execption } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EventEmitter } from 'events';
import { KafkaTransportOpts } from '../const';


export class KafkaClientTransportSession extends ClientTransportSession {
    private regTopics?: RegExp[];
    private events = new EventEmitter();
    
    async bindTopics(topics: (string | RegExp)[]) {
        const consumer = this.socket.consumer;
        if (!consumer) throw new Execption('No consumer');
        await consumer.subscribe({
            topics,
            ... (this.options as KafkaTransportOpts).subscribe,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        await consumer.run({
            // autoCommit: true,
            // autoCommitInterval: 5000,
            // autoCommitThreshold: 100,
            ...(this.options as KafkaTransportOpts).run,
            eachMessage: async (payload: any) => {
                this.events.emit(ev.MESSAGE, payload);
            }
        })
    }
}