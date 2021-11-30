import { ApplicationContext, ComponentScan, Disposable, StartupService } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { Http2Server, Http2SecureServer, createServer, createSecureServer } from 'http2';


@ComponentScan()
export class Http2StartupService implements StartupService, Disposable {

    constructor(@Logger() private logger: ILogger) { }

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

    dispose(): Promise<void> {
        let defer = lang.defer<void>();
        this.service.close((err) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        return defer.promise;
    }
}