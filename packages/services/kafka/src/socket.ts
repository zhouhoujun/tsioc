import { Consumer, Producer, ConsumerSubscribeTopics, ConsumerRunConfig } from 'kafkajs';

export class KafkaSocket {

    private regTopics?: RegExp[];
    constructor(readonly consumer: Consumer, readonly producer: Producer, private runOptions: ConsumerRunConfig) {

    }

    async subscribe(topics: (string | RegExp)[], options: Omit<ConsumerSubscribeTopics, 'topics'>) {
        const consumer = this.consumer;
        await consumer.subscribe({
            topics,
            ...options,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        await consumer.run(this.runOptions);
        // await consumer.run({
        //     // autoCommit: true,
        //     // autoCommitInterval: 5000,
        //     // autoCommitThreshold: 100,
        //     ...this.runOptions,
        //     eachMessage: async (payload) => {
        //         if (this.options.serverSide && payload.topic.endsWith('.reply')) return;
        //         this.events.emit(ev.MESSAGE, payload);
        //     }
        // })
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