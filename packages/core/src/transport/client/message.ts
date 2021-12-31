import { Inject, Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Router, RouterResolver } from '../middlewares/router';
import { ReadPacket, WritePacket } from '../packet';
import { AbstractClient } from './client';


@Injectable()
export class MessageClient extends AbstractClient {

    private router: Router | undefined;
    @Inject()
    private resolver!: RouterResolver;
    async connect(): Promise<void> {
        if (!this.router) {
            this.router = this.resolver.resolve('msg');
        }
    }

    async onDispose(): Promise<void> {
        this.router = null!;
    }

    protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        // const req: Request = new RequestBase(packet);
        // const headers = req.getHeaders();
        // const rep = new ResponseBase({ headers });
        // return new ContextBase(req, rep, injector);
        // this.router?.execute()
        throw new Error('Method not implemented.');
    }

    protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

}
