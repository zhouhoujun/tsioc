import { Handle, Route, Router } from '@tsdi/core';

/**
 * component renderer router.
 */
@Handle()
export class RendererMapping extends Router {
    constructor() {
        super(Route.createProtocol('render:'))
    }
}
