"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOM_ELEMENTS = exports.COMPONENTDEF = exports.DIRECTIVES = exports.BINDINGS = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    /**
     * The TNode contains information about a DOM element aka {@link RElement}.
     */
    NodeType[NodeType["Element"] = 1] = "Element";
    /**
     * The TNode contains information about a DOM element aka {@link RText}.
     */
    NodeType[NodeType["Text"] = 3] = "Text";
    /**
     * The TNode contains information about a DOM element aka {@link RComment}.
     */
    NodeType[NodeType["Comment"] = 8] = "Comment";
    /**
     * The TNode contains information about an {@link ViewContainerRef} for embedded views.
     */
    NodeType[NodeType["Container"] = 16] = "Container";
    /**
     * The TNode contains information about an `<v-container>` element {@link RNode}.
     */
    NodeType[NodeType["ElementContainer"] = 32] = "ElementContainer";
    /**
     * The TNode contains information about an `<v-content>` projection
     */
    NodeType[NodeType["Projection"] = 64] = "Projection";
    /**
     * The TNode contains information about an {@link RTemplate} for embedded views.
     */
    NodeType[NodeType["Template"] = 128] = "Template";
    // Combined Types These should never be used for `TNode.type` only as a useful way to check
    // if `TNode.type` is one of several choices.
    // See: https://github.com/microsoft/TypeScript/issues/35875 why we can't refer to existing enum.
    NodeType[NodeType["AnyRNode"] = 3] = "AnyRNode";
    NodeType[NodeType["AnyContainer"] = 48] = "AnyContainer";
})(NodeType || (exports.NodeType = NodeType = {}));
exports.BINDINGS = Symbol('__BINDINGS');
exports.DIRECTIVES = Symbol('__DIRECTIVES');
exports.COMPONENTDEF = Symbol('__COMPONENTDEF');
exports.CUSTOM_ELEMENTS = Symbol('__CUSTOM_ELEMENTS');
//# sourceMappingURL=Node.js.map