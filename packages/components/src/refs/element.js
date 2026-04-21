"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementRef = void 0;
const effect_1 = require("../effect");
/**
 * A wrapper around a native element inside of a View.
 *
 * An `ElementRef` is backed by a render-specific element. In the browser, this is usually a DOM
 * element.
 *
 * @security Permitting direct access to the DOM can make your application more vulnerable to
 * XSS attacks. Carefully review any use of `ElementRef` in your code.
 *
 * @publicApi
 */
class ElementRef {
    constructor(nativeElement) {
        this[_a] = true;
        this.nativeElement = nativeElement;
    }
}
exports.ElementRef = ElementRef;
_a = effect_1.noReact;
//# sourceMappingURL=element.js.map