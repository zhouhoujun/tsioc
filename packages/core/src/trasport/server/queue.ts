import { ComponentScan } from '../../metadata/decor';
import { AbstractServer } from './server';

@ComponentScan({
    order: 0
})
export class MessageQueue extends AbstractServer {
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}