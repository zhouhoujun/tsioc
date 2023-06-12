import { AbstractAssetContext } from '@tsdi/transport';
import { KafkaIncoming } from './incoming';
import { KafkaOutgoing } from './outgoing';


export class KafkaContext extends AbstractAssetContext<KafkaIncoming, KafkaOutgoing, number> {
    isAbsoluteUrl(url: string): boolean {
        return kafkaAbl.test(url);
    }
    protected parseURL(req: KafkaIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port } = this.getListenOpts();
            const baseUrl = new URL(`${this.protocol}://${host}:${port ?? 9092}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }
    get writable(): boolean {
        return this.response.writable
    }

    get protocol(): string {
        return 'kafka'
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
        return false
    }

}

const kafkaAbl = /^kafka:\/\//;
