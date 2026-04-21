/**
 * http request method.
 */
export type HttpRequestMethod = 'HEAD' | 'OPTIONS' | 'GET' | 'DELETE' | 'PATCH' | 'POST' | 'PUT' | 'JSONP' | 'TRACE';
/**
 * grpc request method.
 */
export type GrpcRequestMethod = 'NO_STREAM' | 'RX_STREAM' | 'PT_STREAM' | 'METHOD';
/**
 * request method.
 */
export type RequestMethod = HttpRequestMethod | GrpcRequestMethod | 'EVENT' | 'MESSAGE';
/**
 * HEAD method
 */
export declare const HEAD = "HEAD";
/**
 * OPTIONS method
 */
export declare const OPTIONS = "OPTIONS";
/**
 * GET method
 */
export declare const GET = "GET";
/**
 * DELETE method
 */
export declare const DELETE = "DELETE";
/**
 * PATCH method
 */
export declare const PATCH = "PATCH";
/**
 * POST method
 */
export declare const POST = "POST";
/**
 * PUT method
 */
export declare const PUT = "PUT";
/**
 * TRACE method
 */
export declare const TRACE = "TRACE";
/**
 * JSONP method
 */
export declare const JSONP = "JSONP";
/**
 * EVENT method
 */
export declare const EVENT = "EVENT";
/**
 * MESSAGE method
 */
export declare const MESSAGE = "MESSAGE";
/**
 * Grpc NO_STREAM method
 */
export declare const NO_STREAM = "NO_STREAM";
/**
 * Grpc RX_STREAM method
 */
export declare const RX_STREAM = "RX_STREAM";
/**
 * Grpc PT_STREAM method
 */
export declare const PT_STREAM = "PT_STREAM";
/**
 * Grpc METHOD method
 */
export declare const METHOD = "METHOD";
