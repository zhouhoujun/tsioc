import { AbstractServer } from '@tsdi/core';

export class KafkaServer extends AbstractServer {
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    
}
