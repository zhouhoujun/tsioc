"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisconnectException = exports.OfflineException = exports.GoawayException = exports.ConfigMissingException = exports.NotHandleException = exports.InvalidStreamException = exports.InvalidJsonException = void 0;
const ioc_1 = require("@tsdi/ioc");
/**
 * Invalid Json execption.
 */
class InvalidJsonException extends ioc_1.Exception {
    constructor(err, source) {
        super(`is invalid JSON: ${err.message}\nSource data: ${source}`);
    }
}
exports.InvalidJsonException = InvalidJsonException;
/**
 * Invaild Stream execption.
 */
class InvalidStreamException extends ioc_1.Exception {
    constructor(message = 'Invalid stream error') {
        super(message);
    }
}
exports.InvalidStreamException = InvalidStreamException;
/**
 * Not handled execption.
 */
class NotHandleException extends ioc_1.Exception {
    constructor(target, targetType, message = 'Not handle') {
        super(message);
        this.target = target;
        this.targetType = targetType;
    }
}
exports.NotHandleException = NotHandleException;
class ConfigMissingException extends ioc_1.Exception {
    constructor(message = 'Config Missing') {
        super(`ConfigMissingException: ${message}`);
    }
}
exports.ConfigMissingException = ConfigMissingException;
class GoawayException extends ioc_1.Exception {
    constructor(message = 'Connection gowary') {
        super(`GoawayException: ${message}`);
    }
}
exports.GoawayException = GoawayException;
class OfflineException extends ioc_1.Exception {
    constructor(message = 'Connection offline') {
        super(`OfflineException: ${message}`);
    }
}
exports.OfflineException = OfflineException;
class DisconnectException extends ioc_1.Exception {
    constructor(message = 'Connection disconnect') {
        super(`DisconnectException: ${message}`);
    }
}
exports.DisconnectException = DisconnectException;
//# sourceMappingURL=execptions.js.map