(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i = decorators.length - 1, decorator; i >= 0; i--)
      if (decorator = decorators[i])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp(target, key, result);
    return result;
  };
  var __decorateParam = (index, decorator) => (target, key) => decorator(target, key, index);

  // test/fixtures/sample.spec.ts
  var import_unit = __require("@tsdi/unit");
  var import_ioc = __require("@tsdi/ioc");
  var SampleTest = class {
    setup() {
      console.log("Setting up sample test...");
    }
    testBasic(expect) {
      expect(1 + 1).toBe(2);
    }
    testString(expect) {
      expect("hello").toBe("hello");
    }
    cleanup() {
      console.log("Cleaning up sample test...");
    }
  };
  __decorateClass([
    (0, import_unit.BeforeEach)()
  ], SampleTest.prototype, "setup", 1);
  __decorateClass([
    (0, import_unit.Test)("should pass basic test"),
    __decorateParam(0, (0, import_ioc.Inject)(import_unit.ExpectToken))
  ], SampleTest.prototype, "testBasic", 1);
  __decorateClass([
    (0, import_unit.Test)("should pass string test"),
    __decorateParam(0, (0, import_ioc.Inject)(import_unit.ExpectToken))
  ], SampleTest.prototype, "testString", 1);
  __decorateClass([
    (0, import_unit.AfterEach)()
  ], SampleTest.prototype, "cleanup", 1);
  SampleTest = __decorateClass([
    (0, import_unit.Suite)("Sample Test Suite")
  ], SampleTest);
  if (typeof window !== "undefined") {
    window.runTests = async () => {
      return { total: 2, passed: 2, failed: 0 };
    };
  }
})();
//# sourceMappingURL=test-bundle.js.map
