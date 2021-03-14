import { Handle, Router } from '@tsdi/boot';

/**
 * component renderer router.
 */
@Handle()
export class RendererMapping extends Router {
    constructor() {
        super('', '', 'render:')
    }
}
