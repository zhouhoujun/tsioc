import { Incoming } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';


export class MqttContext extends AbstractAssetContext {

    isAbsoluteUrl(url: string): boolean {
        return mqttabs.test(url)
    }

    protected parseURL(req: Incoming<any, any>, prooxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, withCredentials } = this.getListenOpts();
            const baseUrl = new URL(`${withCredentials ? 'mqtts' : 'mqtt'}://${host}:${port ?? 3000}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }
    get writable(): boolean {
        return this.response.writable
    }
    get protocol(): string {
        return this.secure ? 'mqtts' : 'mqtt'
    }
    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.vaildator.isEmpty(status)) this.body = null;
    }
    get statusMessage(): string {
        return this.response.statusMessage
    }
    set statusMessage(message: string) {
        this.response.statusMessage = message
    }
    get secure(): boolean {
        return this.getListenOpts()?.withCredentials === true;
    }
}

const mqttabs = /^(mqtt|mqtts|tcp|ssl|ws|wss|wx|wxs|alis):\/\//i;
