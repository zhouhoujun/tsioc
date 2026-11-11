import { importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, Transport, TransferSide } from '@tsdi/common';
import { of } from 'rxjs';
import { GrpcServer } from './grpc-server';
import { GrpcServOptions, GRPC_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, getServiceBackendToken, ServiceTransportFeature } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function grpcTransportFactory(option: Partial<GrpcServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.server, microservice: true,
        ...option,
        features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as GrpcServOptions;

    const backendToken = getServiceBackendToken(config);
    const backendProvider = {
        provide: backendToken,
        useValue: (_req: any, _context: any): any => {
            const error = new NotFoundException('Not Found', 404);
            return of({ statusCode: error.statusCode, statusMessage: error.message, error });
        },
        multi: true
    };

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: GRPC_SERV_OPTIONS,
        serverType: GrpcServer,
        providers: [importProvidersFrom(ServerCommonModule)],
        backendProvider
    });
}

export function useGrpcTransport(...options: Partial<GrpcServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => grpcTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
