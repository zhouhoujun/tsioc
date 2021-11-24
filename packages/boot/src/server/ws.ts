import { AbstractServer } from './server';

export class WSServer extends AbstractServer {
    startup(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    
}
