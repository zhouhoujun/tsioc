
// CommonJS / Node have global context exposed as "global" variable.
// We don't want to include the whole node.d.ts this this compilation unit so we'll just fake

import { _tyundef } from '@tsdi/ioc';

// the global "global" var for now.
declare const global: any;
declare const WorkerGlobalScope: any;

const __window = typeof window !== _tyundef && window;
const __self = typeof self !== _tyundef && typeof WorkerGlobalScope !== _tyundef &&
    self instanceof WorkerGlobalScope && self;
const __global = typeof global !== _tyundef && global;

// Check __global first, because in Node tests both __global and __window may be defined and _global
// should be __global in that case.
const _global: { [name: string]: any } = __global || __window || __self;
export { _global as global };
