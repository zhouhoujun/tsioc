import { Handle, Router } from '@tsdi/core';

/**
 * component renderer router.
 */
@Handle()
export class RendererMapping extends Router {
    constructor() {
        super('', '', 'render:')
    }
}
