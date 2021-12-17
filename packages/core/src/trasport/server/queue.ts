import { ComponentScan } from '../../metadata/decor';
import { AbstractServer } from './server';

@ComponentScan({
    order: 0
})
export class MessageQueue extends AbstractServer {

    async startup(): Promise<void> {

    }

    async onDispose(): Promise<void> {

    }

}
