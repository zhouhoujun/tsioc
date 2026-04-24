import { Injectable } from '@tsdi/ioc';
import { IServiceTransportStrategy } from '@tsdi/endpoints';

/** Placeholder UDP server-side strategy. */
@Injectable()
export class UdpServerStrategy implements IServiceTransportStrategy {
    // Intentionally minimal; UDP server transport wiring is handled elsewhere in the UDP module.
}
