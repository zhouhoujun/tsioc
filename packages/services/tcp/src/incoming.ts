import { Injectable } from '@tsdi/ioc';
import { BodyOpts, CloneOpts, Pattern, PayloadOpts } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingInitOpts, ClientPatternIncoming, IncomingCloneOpts, IncomingFactory, IncomingInitOpts, IncomingPacket, PatternIncoming } from '@tsdi/common/transport';



export class TcpIncoming<T = any> extends PatternIncoming<T> {

    protected createInstance(initOpts: IncomingInitOpts, cloneOpts: IncomingCloneOpts<any> & { pattern?: Pattern | undefined; }): IncomingPacket<any, any> {
        const pattern = cloneOpts.pattern ?? this.pattern;
        const payload = this.updatePayload(cloneOpts);
        return new TcpIncoming(pattern, payload, initOpts)
    }

}

@Injectable()
export class TcpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingInitOpts & BodyOpts<T> & PayloadOpts<T> & { pattern: Pattern; }): TcpIncoming<T> {
        return new TcpIncoming<T>(packet.pattern, packet.payload ?? packet.body, packet);
    }
}


export class TcpClientIncoming<T = any> extends ClientPatternIncoming<T, null> {

    protected createInstance(initOpts: ClientIncomingInitOpts<any>, cloneOpts: CloneOpts<any> & { pattern?: Pattern | undefined; }): TcpClientIncoming {
        const pattern = cloneOpts.pattern ?? this.pattern;
        const payload = this.updatePayload(cloneOpts);
        return new TcpClientIncoming(pattern, payload, initOpts);
    }
}

@Injectable()
export class TcpClientIncomingFactory implements ClientIncomingFactory<{ pattern: Pattern }> {

    create<T = any>(options: IncomingInitOpts & BodyOpts<T> & PayloadOpts<T> & { pattern: Pattern }): TcpClientIncoming<T> {
        return new TcpClientIncoming(options.pattern, options.payload ?? options.body, options);
    }

}