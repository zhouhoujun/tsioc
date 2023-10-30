import { EMPTY_OBJ, Injectable, Injector } from '@tsdi/ioc';
import { Incoming, IncomingPacket, InternalServerExecption, LOCALHOST, Outgoing, StatusCode, TransportSession } from '@tsdi/common';
import { AssetContext, AssetContextFactory, ServerOpts } from '@tsdi/endpoints';
import { AbstractAssetContext, ServerOptions } from '../asset.context';
import { IncomingMessage } from '../incoming';
import { OutgoingMessage } from '../outgoing';



export class AssetContextImpl<TSocket> extends AbstractAssetContext<Incoming<TSocket>, Outgoing<TSocket>, ServerOptions> {

    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }

    protected parseURL(req: Incoming<TSocket>, proxy?: boolean | undefined): URL {
        const url = req.url || req.originalUrl || req.topic || '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const protocol = this.serverOptions.protocol ?? this.serverOptions.transportOpts?.transport;
            const baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}${port ? ':' + port : ''}`, (path && (host || port)) ? path : undefined);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return (this.response as any).writable === true;
    }

    get status(): StatusCode {
        return this.response.statusCode;
    }
    set status(code: StatusCode) {
        if (this.sent) return;

        if (!this.vaildator.isStatus(code)) throw new InternalServerExecption(`invalid status code: ${code}`)
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (this.body && this.vaildator.isEmpty(code)) this.body = null;
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? '';
    }
    set statusMessage(message: string) {
        this.response.statusMessage = message;
    }

    get secure(): boolean {
        return this.serverOptions.secure == true;
    }

}

const abstl = /^\w+:\/\//i;

@Injectable()
export class AssetContextFactoryImpl implements AssetContextFactory {
    create(injector: Injector, session: TransportSession<any, any>, incoming: IncomingPacket<any>, options: ServerOpts<any>): AssetContext<any, any, ServerOpts<any>> {
        return new AssetContextImpl(injector, session, incoming.req ?? new IncomingMessage(session, incoming), incoming.res ?? new OutgoingMessage(session, incoming), options);
    }

}