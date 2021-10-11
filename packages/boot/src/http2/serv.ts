import { ApplicationContext, Boot, StartupService } from '@tsdi/core';
import { Http2Server, Http2SecureServer, createServer, createSecureServer } from 'http2';


@Boot()
export class Http2StartupService extends StartupService {
    private _service!: Http2Server | Http2SecureServer;
    get service(): Http2Server | Http2SecureServer {
        return this._service;
    }

    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.getConfiguration();
        if (config.serverOptions?.key && config.serverOptions?.cert) {
            this._service = createSecureServer(config.serverOptions, (req, res) => {
                ctx.send()
            });
        } else if (config.serverOptions) {
            this._service = createServer(config.serverOptions, (req, res) => {
                ctx.send();
            });
        } else {
            this._service = createServer((req, res) => {
                ctx.send();
            });
        }

        this.service.listen(config.port, config.hostname);

    }
}