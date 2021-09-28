import { Handle, RootRouter, Router } from '@tsdi/core'


@Handle({
    parent: RootRouter,
    protocol: 'http:;https:'
})
export class HttpRouter extends Router {

}