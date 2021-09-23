import { Handle, RootRouter, Router } from '@tsdi/core'


@Handle({
    parent: RootRouter,
    protocol: 'http:;https:;http2:'
})
export class HttpRouter extends Router {

}