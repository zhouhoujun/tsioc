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
        if(config.secure){
            this._service = createSecureServer((req, res)=> {
                ctx.send()
            });
        }
        this._service = createServer((req, res) => {
            ctx.send();
        })

    }
}