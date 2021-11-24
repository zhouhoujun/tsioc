import { AbstractServer } from './server';

export class RMQServer extends AbstractServer {
    startup(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    
}
