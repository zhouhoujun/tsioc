import { Exception } from '@tsdi/ioc';
/**
 * Message Exception
 *
 * @export
 * @extends {Exception}
 */
export declare class MessageException extends Exception {
    status?: any | undefined;
    headerSent?: boolean;
    headers?: Record<string, any>;
    code?: any;
    constructor(message?: string | string[], status?: any | undefined);
    get statusCode(): any;
    toString(): string;
}
/**
 * about execption.
 */
export declare class AboutException extends MessageException {
    constructor(message?: string);
}
/**
 * Invalid header token execption.
 */
export declare class InvalidHeaderTokenException extends MessageException {
    constructor(message?: string);
}
/**
 * Invalid state execption.
 */
export declare class InvalidStateException extends MessageException {
    constructor(message?: string);
}
/**
 * security execption.
 */
export declare class SecurityException extends MessageException {
    constructor(message?: string);
}
/**
 * Bad request execption.
 *
 * @export
 * @class BadRequestException
 * @extends {MessageException}
 */
export declare class BadRequestException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Unauthorized execption.
 *
 * @export
 * @class UnauthorizedException
 * @extends {MessageException}
 */
export declare class UnauthorizedException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenException
 * @extends {MessageException}
 */
export declare class ForbiddenException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Not found execption.
 *
 * @export
 * @class NotFoundException
 * @extends {MessageException}
 */
export declare class NotFoundException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Method Not Allowed execption.
 *
 * @export
 * @class MethodNotAllowedException
 * @extends {MessageException}
 */
export declare class MethodNotAllowedException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Not Acceptable execption.
 *
 * @export
 * @class NotAcceptableException
 * @extends {MessageException}
 */
export declare class NotAcceptableException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * unsupported media type execption.
 */
export declare class UnsupportedMediaTypeException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Request Timeout execption.
 *
 * @export
 * @class TimeoutException
 * @extends {MessageException}
 */
export declare class RequestTimeoutException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * internal server execption.
 *
 * server side exception.
 */
export declare class InternalServerException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Not implemented execption.
 *
 * server side exception.
 */
export declare class NotImplementedException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Bad Gateway execption.
 *
 * server side exception.
 */
export declare class BadGatewayException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Service Unavailable execption.
 *
 * server side exception.
 */
export declare class ServiceUnavailableException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * Gateway Timeout execption.
 *
 * server side exception.
 */
export declare class GatewayTimeoutException extends MessageException {
    constructor(message?: string, status?: string | number);
}
/**
 * connection refused error.
 * socket error code
 */
export declare const ECONNREFUSED = "ECONNREFUSED";
/**
 * Address already in use error.
 * socket error code
 */
export declare const EADDRINUSE = "EADDRINUSE";
/**
 * connection read timeout.
 * socket error code
 */
export declare const ECONNRESET = "ECONNRESET";
/**
 * Address not found in dns.
 * socket error code
 */
export declare const ENOTFOUND = "ENOTFOUND";
/**
 * not directory.
 */
export declare const ENOTDIR = "ENOTDIR";
/**
 * No such file or directory.
 */
export declare const ENOENT = "ENOENT";
/**
 * name too long.
 */
export declare const ENAMETOOLONG = "ENAMETOOLONG";
export declare class InvalidStreamException extends Exception {
    constructor(message?: string);
}
export declare class HeandersSentException extends Exception {
    constructor(message?: string);
}
export declare class InvalidSessionException extends Exception {
    constructor(message?: string);
}
/**
 * Not Supported execption.
 *
 * server side exception.
 */
export declare class NotSupportedException extends MessageException {
    constructor(message?: string, status?: string | number);
}
export declare class PushDisabledException extends Exception {
    constructor(message?: string);
}
export declare class NestedPushException extends Exception {
    constructor(message?: string);
}
export declare class PacketLengthException extends Exception {
}
