import { AbstractAssetContext } from '@tsdi/transport';
import { MqttIncoming } from './incoming';
import { MqttOutgoing } from './outgoing';
import { MqttServiceOpts } from './options';


export class MqttContext extends AbstractAssetContext<MqttIncoming, MqttOutgoing, number, MqttServiceOpts> {

    isAbsoluteUrl(url: string): boolean {
        return mqttabs.test(url)
    }

    protected parseURL(req: MqttIncoming, prooxy?: boolean | undefined): URL {
        const requrl = req.url ?? '';
        if (this.isAbsoluteUrl(requrl)) {
            return new URL(requrl);
        } else {
            const { url, host, port } = this.serverOptions.connectOpts!;
            const baseUrl = url ? new URL(url) : new URL(`${this.secure ? 'mqtts' : 'mqtt'}://${host}:${port ?? 3000}`);
            const uri = new URL(requrl, baseUrl);
            return uri;
        }
    }
    get writable(): boolean {
        return this.response.writable
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
        return !!this.serverOptions.connectOpts?.cert;
    }
}

const mqttabs = /^(mqtt|mqtts|tcp|ssl|ws|wss|wx|wxs|alis):\/\//i;
