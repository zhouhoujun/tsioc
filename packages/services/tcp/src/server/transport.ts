import { Injectable } from '@tsdi/ioc';
import {
    IncomingFactory, UrlIncomingOptions, UrlIncoming,
    Incoming, OutgoingFactory, ServerOutgoing, OutgoingOpts 
} from '@tsdi/common/transport';



export class TcpIncoming<T> extends UrlIncoming<T> {
    push(chunk: any, encoding?: string): boolean {
        throw new Error('Method not implemented.');
    }
}

@Injectable()
export class TcpIncomingFactory implements IncomingFactory {
    create<T>(packet: UrlIncomingOptions<T>): TcpIncoming<T> {
        return new TcpIncoming<T>(packet);
    }
}



export class TcpOutgoing<T, TStatus = null> extends ServerOutgoing<T, TStatus> {
    write(data: any, cb?: (err?: Error | null) => void): boolean;
    write(data: any, encoding?: string, cb?: (err?: Error | null) => void): boolean;
    write(data: unknown, encoding?: unknown, cb?: unknown): boolean {
        throw new Error('Method not implemented.');
    }
    end(cb?: () => void): this;
    end(data: any, cb?: () => void): this;
    end(data: any, encoding?: string, cb?: () => void): this;
    end(data?: unknown, encoding?: unknown, cb?: unknown): this {
        throw new Error('Method not implemented.');
    }
}


export class TcpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingOpts<T, any>): TcpOutgoing<T> {
        return new TcpOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}