import { Handle, Route, Router } from '@tsdi/core';

/**
 * component host mapping message router root.
 */
@Handle()
export class HostMappingRoot extends Router {
    constructor() {
        super(Route.createProtocol('host:'))
    }
}
