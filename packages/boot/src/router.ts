import { Context, Handle, Route, Router } from '@tsdi/core'


@Handle({
    protocol: 'http:;https:'
})
export class HttpRouter extends Router {


}