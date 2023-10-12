import { Incoming, Outgoing, StatusCode } from '@tsdi/common';
import { AbstractAssetContext } from '../asset.context';
import { EMPTY_OBJ } from '@tsdi/ioc';


export class AssetContextImpl<TSocket> extends AbstractAssetContext<Incoming, Outgoing, StatusCode> {

    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }

    protected parseURL(req: Incoming<any>, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const protocol = this.serverOptions.protocol;
            const baseUrl = new URL(`${protocol}://${host}:${port ?? 3000}`, path);
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
    set status(status: StatusCode) {
        this.response.statusCode = status;
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