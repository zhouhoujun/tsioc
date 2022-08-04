import { Injectable } from '@tsdi/ioc';
import { ClientSession, ClientSessionBuilder } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import { Socket, createSocket, SocketOptions } from 'dgram';


@Injectable()
export class CoapClientSessioBuilder implements ClientSessionBuilder {


    constructor(){

    }

    build(connectOpts: SocketOptions): Observable<ClientSession> {
        const client = createSocket(connectOpts);
        return new Observable((observer: Observer<ClientSession>) => {

        });
    }

}