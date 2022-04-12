import { Endpoint, Middleware } from '../transport/endpoint';
import { RequestBase, WritableResponse } from '../transport/packet';


/**
 * Endpoint is the fundamental building block of server route.
 */
export interface RouteEndpoint extends Endpoint<RequestBase, WritableResponse> {

}

/**
 * Route middleware is a chainable behavior modifier for route endpoints.
 */
export interface RouteMiddleware extends Middleware<RequestBase, WritableResponse> {

}
