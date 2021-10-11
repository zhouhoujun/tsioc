import { ApplicationContext, Boot, StartupService } from '@tsdi/core';
import { Server, createServer } from 'http';
import { Server as SServer, createServer as createSServer } from 'https';

@Boot()
export class HttpStartupService extends StartupService {
    private _service!: Server | SServer;
    get service(): Server | SServer {
        return this._service;
    }

    async configureService(ctx: ApplicationContext): Promise<void> {
        const config = ctx.getConfiguration();
        if (config.serverOptions?.key && config.serverOptions?.cert) {
            this._service = createSServer(config.serverOptions, (req, res) => {
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
