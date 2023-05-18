
/**
 * mqtt protocol.
 */
export type MqttProtocols = 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
/**
 * http protocol.
 */
export type HttpProtocols = 'http' | 'https';

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
export type RequestMethod = HttpRequestMethod | GrpcRequestMethod | 'EVENT' | 'MESSAGE';// event

/**
 * transport protocol types.
 */
export type Protocol ='tcp' | 'grpc' | 'rmq' | 'modbus' | 'mqtt' |  'kafka' | 'redis';

//http
/**
 * HEAD method
 */
export const HEAD = 'HEAD';
/**
 * OPTIONS method
 */
export const OPTIONS = 'OPTIONS';
/**
 * GET method
 */
export const GET = 'GET';
/**
 * DELETE method
 */
export const DELETE = 'DELETE';
/**
 * PATCH method
 */
export const PATCH = 'PATCH';
/**
 * POST method
 */
export const POST = 'POST';
/**
 * PUT method
 */
export const PUT = 'PUT';
/**
 * TRACE method
 */
export const TRACE = 'TRACE';
/**
 * JSONP method
 */
export const JSONP = 'JSONP';

//message
/**
 * EVENT method
 */
export const EVENT = 'EVENT';
/**
 * MESSAGE method
 */
export const MESSAGE = 'MESSAGE';

//grpc
/**
 * Grpc NO_STREAM method
 */
export const NO_STREAM = 'NO_STREAM';
/**
 * Grpc RX_STREAM method
 */
export const RX_STREAM = 'RX_STREAM';
/**
 * Grpc PT_STREAM method
 */
export const PT_STREAM = 'PT_STREAM';
/**
 * Grpc METHOD method
 */
export const METHOD = 'METHOD';

