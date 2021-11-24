import { AbstractServer } from './server';

export class KafkaServer extends AbstractServer {
    startup(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    
}
