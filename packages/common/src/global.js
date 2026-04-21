"use strict";
// CommonJS / Node have global context exposed as "global" variable.
// We don't want to include the whole node.d.ts this this compilation unit so we'll just fake
Object.defineProperty(exports, "__esModule", { value: true });
exports.global = void 0;
const _tyundef = 'undefined';
const __window = typeof window !== _tyundef && window;
const __self = typeof self !== _tyundef && typeof WorkerGlobalScope !== _tyundef &&
    self instanceof WorkerGlobalScope && self;
const __global = typeof global !== _tyundef && global;
// Check __global first, because in Node tests both __global and __window may be defined and _global
// should be __global in that case.
const _global = __global || __window || __self;
exports.global = _global;
//# sourceMappingURL=global.js.map