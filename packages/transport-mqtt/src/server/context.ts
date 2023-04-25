import { Incoming, ListenOpts } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';


export class MqttContext extends AbstractAssetContext {

    isAbsoluteUrl(url: string): boolean {
        return absurl.test(url)
    }
    protected parseURL(req: Incoming<any, any>, listenOpts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }
    get secure(): boolean {
        throw new Error('Method not implemented.');
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get status(): string | number {
        throw new Error('Method not implemented.');
    }
    set status(status: string | number) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(message: string) {
        throw new Error('Method not implemented.');
    }

}

const absurl = /^(mqtt|mqtts|tcp|ssl|ws|wss|wx|wxs|alis):\/\//i;
