import { Abstract, Execption, Injectable, InvocationContext, Token, isArray, isUndefined } from '@tsdi/ioc';
import { ListenOpts, ConfigableEndpointOptions, Server, TransportEndpoint, Router, NO_STREAM, RX_STREAM, PT_STREAM } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Observable, Subscription } from 'rxjs';
import { Server as GServer, ChannelOptions, ServerCredentials, loadPackageDefinition, UntypedHandleCall } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { GrpcContext } from './context';
import { GrpcServOptions } from './options';
import { GrpcEndpoint } from './endpoint';
import { DefinitionLoader } from '../loader';


@Injectable()
export class GrpcServer extends Server<GrpcContext, Http2ServerResponse>  {

    @InjectLog() logger!: Logger;

    constructor(
        readonly endpoint: GrpcEndpoint,
        private loader: DefinitionLoader,
        private router: Router,
        private options: GrpcServOptions) {
        super()
    }

    private server?: GServer;
    protected async onStartup(): Promise<any> {
        this.server = new GServer(this.options.channelOptions);
        const definition = await this.loader.load(this.options.protoPath);
        const packageObject = loadPackageDefinition(definition);
        await Promise.all((isArray(this.options.package) ? this.options.package : [this.options.package]).map(name => {
            const grpcPkg = this.loader.lookupPackage(packageObject, name);
            return this.createServices(grpcPkg, name);
        }))
    }

    protected async onStart(): Promise<any> {
        if (!this.server) throw new Execption('Grpc Server not init.');

        if (this.options.port) {
            const creds = this.endpoint.injector.get(ServerCredentials);
            this.server.bind(this.options.port, creds);
        }
    }
    protected async onShutdown(): Promise<any> {

    }

    private async createServices(grpcPkg: any, packageName: string) {
        if (!this.server) throw new Execption('Grpc Server not init.');
        if (!grpcPkg) {
            const invalidPackageError = new Execption(packageName, 'is invalid GrpcPackage');
            this.logger.error(invalidPackageError.message, invalidPackageError.stack);
            throw invalidPackageError;
        }

        for (const definition of this.loader.getSevices(grpcPkg)) {
            const { name, service } = definition;
            this.server.addService(
                service.service,
                await this.createService(service, name),
            );
        }
    }

    public async createService(grpcService: any, name: string) {
        const service: Record<string, UntypedHandleCall> = {};

        for (const methodName in grpcService.prototype) {
            let pattern = '';
            let methodHandler = null;
            let streamingType = NO_STREAM;

            const methodFunction = grpcService.prototype[methodName];
            const methodReqStreaming = methodFunction.requestStream;

            if (!isUndefined(methodReqStreaming) && methodReqStreaming) {
                // Try first pattern to be presented, RX streaming pattern would be
                // a preferable pattern to select among a few defined
                pattern = this.createPattern(
                    name,
                    methodName,
                    RX_STREAM,
                );
                methodHandler = this.router.findRoute(pattern);
                streamingType = RX_STREAM;
                // If first pattern didn't match to any of handlers then try
                // pass-through handler to be presented
                if (!methodHandler) {
                    pattern = this.createPattern(
                        name,
                        methodName,
                        PT_STREAM,
                    );
                    methodHandler = this.router.findRoute(pattern);
                    streamingType = PT_STREAM;
                }
            } else {
                pattern = this.createPattern(
                    name,
                    methodName,
                    NO_STREAM,
                );
                // Select handler if any presented for No-Streaming pattern
                methodHandler = this.router.findRoute(pattern);
                streamingType = NO_STREAM;
            }
            if (!methodHandler) {
                continue;
            }
            service[methodName] = await this.createServiceMethod(
                methodHandler,
                grpcService.prototype[methodName],
                streamingType,
            );
        }
        return service;
    }

    protected createPattern(service: string, rpc: string, streaming: string): string {
        return JSON.stringify({
            service,
            rpc,
            streaming,
          });
    }

    
    createServiceMethod(methodHandler: any, fn: any, streamingType: string): UntypedHandleCall {
        throw new Error('Method not implemented.');
    }





}