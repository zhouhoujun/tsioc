"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacketLengthException = exports.NestedPushException = exports.PushDisabledException = exports.NotSupportedException = exports.InvalidSessionException = exports.HeandersSentException = exports.InvalidStreamException = exports.ENAMETOOLONG = exports.ENOENT = exports.ENOTDIR = exports.ENOTFOUND = exports.ECONNRESET = exports.EADDRINUSE = exports.ECONNREFUSED = exports.GatewayTimeoutException = exports.ServiceUnavailableException = exports.BadGatewayException = exports.NotImplementedException = exports.InternalServerException = exports.RequestTimeoutException = exports.UnsupportedMediaTypeException = exports.NotAcceptableException = exports.MethodNotAllowedException = exports.NotFoundException = exports.ForbiddenException = exports.UnauthorizedException = exports.BadRequestException = exports.SecurityException = exports.InvalidStateException = exports.InvalidHeaderTokenException = exports.AboutException = exports.MessageException = void 0;
const ioc_1 = require("@tsdi/ioc");
/**
 * Message Exception
 *
 * @export
 * @extends {Exception}
 */
class MessageException extends ioc_1.Exception {
    constructor(message, status) {
        super((0, ioc_1.isArray)(message) ? message.join('\n') : message ?? '');
        this.status = status;
    }
    get statusCode() {
        return this.status;
    }
    toString() {
        return `Message Exception: ${this.statusCode}, ${this.message}`;
    }
}
exports.MessageException = MessageException;
/**
 * about execption.
 */
class AboutException extends MessageException {
    constructor(message = 'About') {
        super(message);
    }
}
exports.AboutException = AboutException;
/**
 * Invalid header token execption.
 */
class InvalidHeaderTokenException extends MessageException {
    constructor(message = 'Invalid header token.') {
        super(message);
    }
}
exports.InvalidHeaderTokenException = InvalidHeaderTokenException;
/**
 * Invalid state execption.
 */
class InvalidStateException extends MessageException {
    constructor(message = 'INVALID_STATE_ERR') {
        super(message);
    }
}
exports.InvalidStateException = InvalidStateException;
/**
 * security execption.
 */
class SecurityException extends MessageException {
    constructor(message = 'SecurityException') {
        super(message);
    }
}
exports.SecurityException = SecurityException;
/**
 * Bad request execption.
 *
 * @export
 * @class BadRequestException
 * @extends {MessageException}
 */
class BadRequestException extends MessageException {
    constructor(message = 'Bad Request', status) {
        super(message, status);
    }
}
exports.BadRequestException = BadRequestException;
/**
 * Unauthorized execption.
 *
 * @export
 * @class UnauthorizedException
 * @extends {MessageException}
 */
class UnauthorizedException extends MessageException {
    constructor(message = 'Unauthorized', status) {
        super(message, status);
    }
}
exports.UnauthorizedException = UnauthorizedException;
/**
 * forbidden execption.
 *
 * @export
 * @class ForbiddenException
 * @extends {MessageException}
 */
class ForbiddenException extends MessageException {
    constructor(message = 'Forbidden', status) {
        super(message, status);
    }
}
exports.ForbiddenException = ForbiddenException;
/**
 * Not found execption.
 *
 * @export
 * @class NotFoundException
 * @extends {MessageException}
 */
class NotFoundException extends MessageException {
    constructor(message = 'Not Found', status) {
        super(message, status);
    }
}
exports.NotFoundException = NotFoundException;
/**
 * Method Not Allowed execption.
 *
 * @export
 * @class MethodNotAllowedException
 * @extends {MessageException}
 */
class MethodNotAllowedException extends MessageException {
    constructor(message = 'Method Not Allowed', status) {
        super(message, status);
    }
}
exports.MethodNotAllowedException = MethodNotAllowedException;
/**
 * Not Acceptable execption.
 *
 * @export
 * @class NotAcceptableException
 * @extends {MessageException}
 */
class NotAcceptableException extends MessageException {
    constructor(message = 'Not Acceptable', status) {
        super(message, status);
    }
}
exports.NotAcceptableException = NotAcceptableException;
/**
 * unsupported media type execption.
 */
class UnsupportedMediaTypeException extends MessageException {
    constructor(message = 'Unsupported Media Type', status) {
        super(message, status);
    }
}
exports.UnsupportedMediaTypeException = UnsupportedMediaTypeException;
/**
 * Request Timeout execption.
 *
 * @export
 * @class TimeoutException
 * @extends {MessageException}
 */
class RequestTimeoutException extends MessageException {
    constructor(message = 'Request Timeout', status) {
        super(message, status);
    }
}
exports.RequestTimeoutException = RequestTimeoutException;
/**
 * internal server execption.
 *
 * server side exception.
 */
class InternalServerException extends MessageException {
    constructor(message = 'Internal Server Error', status) {
        super(message, status);
    }
}
exports.InternalServerException = InternalServerException;
/**
 * Not implemented execption.
 *
 * server side exception.
 */
class NotImplementedException extends MessageException {
    constructor(message = 'Not Implemented', status) {
        super(message, status);
    }
}
exports.NotImplementedException = NotImplementedException;
/**
 * Bad Gateway execption.
 *
 * server side exception.
 */
class BadGatewayException extends MessageException {
    constructor(message = 'Bad Gateway', status) {
        super(message, status);
    }
}
exports.BadGatewayException = BadGatewayException;
/**
 * Service Unavailable execption.
 *
 * server side exception.
 */
class ServiceUnavailableException extends MessageException {
    constructor(message = 'Service Unavailable', status) {
        super(message, status);
    }
}
exports.ServiceUnavailableException = ServiceUnavailableException;
/**
 * Gateway Timeout execption.
 *
 * server side exception.
 */
class GatewayTimeoutException extends MessageException {
    constructor(message = 'Gateway Timeout', status) {
        super(message, status);
    }
}
exports.GatewayTimeoutException = GatewayTimeoutException;
/**
 * connection refused error.
 * socket error code
 */
exports.ECONNREFUSED = 'ECONNREFUSED';
/**
 * Address already in use error.
 * socket error code
 */
exports.EADDRINUSE = 'EADDRINUSE';
/**
 * connection read timeout.
 * socket error code
 */
exports.ECONNRESET = 'ECONNRESET';
/**
 * Address not found in dns.
 * socket error code
 */
exports.ENOTFOUND = 'ENOTFOUND';
/**
 * not directory.
 */
exports.ENOTDIR = 'ENOTDIR';
/**
 * No such file or directory.
 */
exports.ENOENT = 'ENOENT';
/**
 * name too long.
 */
exports.ENAMETOOLONG = 'ENAMETOOLONG';
class InvalidStreamException extends ioc_1.Exception {
    constructor(message = 'Invalid stream error') {
        super(message);
    }
}
exports.InvalidStreamException = InvalidStreamException;
class HeandersSentException extends ioc_1.Exception {
    constructor(message = 'Headers has sent') {
        super(`HeandersSentException: ${message}`);
    }
}
exports.HeandersSentException = HeandersSentException;
class InvalidSessionException extends ioc_1.Exception {
    constructor(message = 'Invalid session error') {
        super(`InvalidSessionException: ${message}`);
    }
}
exports.InvalidSessionException = InvalidSessionException;
/**
 * Not Supported execption.
 *
 * server side exception.
 */
class NotSupportedException extends MessageException {
    constructor(message = 'Not Supported', status) {
        super(message, status);
    }
}
exports.NotSupportedException = NotSupportedException;
class PushDisabledException extends ioc_1.Exception {
    constructor(message = 'Push disabled') {
        super(`PushDisabledException: ${message}`);
    }
}
exports.PushDisabledException = PushDisabledException;
class NestedPushException extends ioc_1.Exception {
    constructor(message = 'Nest push') {
        super(`NestedPushException: ${message}`);
    }
}
exports.NestedPushException = NestedPushException;
class PacketLengthException extends ioc_1.Exception {
}
exports.PacketLengthException = PacketLengthException;
//# sourceMappingURL=exceptions.js.map