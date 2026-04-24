import { Module } from '@tsdi/ioc';
import { CoapClient } from './client/client';
import { CoapServer } from './server/server';
import { CoapStatusVaildator } from './status';
import { CoapConfiguration } from './configuration';
// Transport strategies and protocol factory
import { CLIENT_TRANSPORT_STRATEGY, BODY_SERIALIZE_STRATEGY, TIMEOUT_STRATEGY } from '@tsdi/common/client';
import { CoapTransportStrategy } from './client/strategies/CoapTransportStrategy';
import { CoapBodySerializeStrategy } from './client/strategies/CoapBodySerializeStrategy';
import { CoapTimeoutStrategy } from './client/strategies/CoapTimeoutStrategy';
import { CoapProtocolFactory } from './client/strategies/CoapProtocolFactory';



@Module({
    declarations:[
        CoapClient,
        CoapServer,
    ],
    providers: [
        CoapStatusVaildator,
        CoapConfiguration,
        // Register CoAP protocol strategies following HTTP/UDP patterns
        { provide: CLIENT_TRANSPORT_STRATEGY, useClass: CoapTransportStrategy },
        { provide: BODY_SERIALIZE_STRATEGY, useClass: CoapBodySerializeStrategy },
        { provide: TIMEOUT_STRATEGY, useClass: CoapTimeoutStrategy },
        // Optional: protocol factory for CoAP (can be expanded later)
        { provide: 'COAP_PROTOCOL_FACTORY', useClass: CoapProtocolFactory }
    ]
})
export class CoapModule {

}
