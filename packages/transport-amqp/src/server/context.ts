import { Incoming, ListenOpts, Outgoing } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';


export class AmqpContext extends AbstractAssetContext<Incoming, Outgoing, number> {
    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    protected parseURL(req: Incoming<any, any>, listenOpts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get status(): number {
        throw new Error('Method not implemented.');
    }
    set status(status: number) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(message: string) {
        throw new Error('Method not implemented.');
    }
    get secure(): boolean {
        throw new Error('Method not implemented.');
    }

}