import { AbstractAssetContext } from '@tsdi/transport';
import { isString } from '@tsdi/ioc';
import { normalize } from '@tsdi/common';
import { KafkaIncoming } from './incoming';
import { KafkaOutgoing } from './outgoing';
import { KafkaServerOptions } from './options';

/**
 * Kafka server context
 */
export class KafkaContext extends AbstractAssetContext<KafkaIncoming, KafkaOutgoing, number, KafkaServerOptions> {
    isAbsoluteUrl(url: string): boolean {
        return kafkaAbl.test(url);
    }
    protected parseURL(req: KafkaIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const hostname = (this.serverOptions.connectOpts?.brokers as String[])?.find(b => b && isString(b)) ?? 'localhost:9092';
            const baseUrl = new URL(`kafka://${hostname}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    protected override getOriginalUrl(request: KafkaIncoming): string {
        return normalize(request.originalUrl);
    }

    override getRequestFilePath() {
        const pathname = this.originalUrl;
        this.mimeAdapter.lookup(pathname);
        return this.mimeAdapter.lookup(pathname) ? pathname : null;
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
