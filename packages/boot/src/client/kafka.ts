import { AbstractClient } from './client';

export class KafkaClient extends AbstractClient {
    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
