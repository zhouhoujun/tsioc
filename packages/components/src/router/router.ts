import { Handle, Router } from '@tsdi/boot';

/**
 * component host mapping message router root.
 */
@Handle()
export class HostMappingRoot extends Router {
    constructor() {
        super('', '', 'host:')
    }
}
