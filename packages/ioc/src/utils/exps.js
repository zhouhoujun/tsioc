"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARGUMENT_NAMES = exports.STRIP_COMMENTS = void 0;
// export const clsNameExp = /^[A-Z@]/;
exports.STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
exports.ARGUMENT_NAMES = /([^\s,]+)/g;
//# sourceMappingURL=exps.js.map