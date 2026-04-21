"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterEach = exports.After = exports.AfterAll = exports.BeforeEach = exports.Before = exports.BeforeAll = exports.Test = exports.Suite = void 0;
exports.createTestDecorator = createTestDecorator;
const ioc_1 = require("@tsdi/ioc");
const SuiteRunner_1 = require("./runner/SuiteRunner");
/**
 * @Suite decorator.
 */
exports.Suite = (0, ioc_1.createDecorator)('Suite', {
    actionType: ioc_1.ActionType.declaration,
    def: {
        class: (ctx) => {
            ctx.define.metadata.suite = true;
            ctx.classRef.assignAnnotation(ctx.define.metadata);
        }
    },
    props: (describe, timeout, e2e) => ({ describe, timeout, e2e }),
    factory: (injector) => {
        return new SuiteRunner_1.SuiteInvocationFactory(injector.getRuntime());
    }
});
/**
 * create Test decorator.
 *
 * @export
 * @template T
 * @param {string} [TestType]
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {TestDecorator<T>}
 */
function createTestDecorator(name, options) {
    options = options ?? {};
    return (0, ioc_1.createDecorator)(name, {
        props: (timeout, setp) => ({ timeout, setp }),
        ...options
    });
}
/**
 * @Test decorator. define the method of class as unit test case.  Describe a specification or test-case with the given `title` and callback `fn` acting
 * as a thunk.
 *
 * @export
 * @interface TestCase
 */
exports.Test = createTestDecorator('TestCase', {
    props: (title, timeout, setp) => ({ title, timeout, setp })
});
/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface BeforeAll
 */
exports.BeforeAll = createTestDecorator('BeforeAll');
/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface BeforeAll
 */
exports.Before = exports.BeforeAll;
/**
 * @BeforeEach decorator. define the method of class as unit test action run before each test case.
 *
 * @export
 * @interface BeforeEach
 */
exports.BeforeEach = createTestDecorator('BeforeEach');
/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface AfterAll
 */
exports.AfterAll = createTestDecorator('AfterAll');
/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface AfterAll
 */
exports.After = exports.AfterAll;
/**
 * @AfterEach decorator. define the method of class as unit test action run after each test case.
 *
 * @export
 * @interface AfterEach
 */
exports.AfterEach = createTestDecorator('TestAfterEach');
//# sourceMappingURL=metadata.js.map