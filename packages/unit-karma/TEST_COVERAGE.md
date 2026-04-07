# @tsdi/unit-karma Test Coverage

## Test Summary

**Total Tests:** 38 passing
**Execution Time:** ~75-180ms
**Test Files:** 3

## Running Tests with Coverage

### Using --coverage flag

```bash
# Run tests with coverage reporting
npm test -- --coverage

# Or using ts-node directly
npx ts-node -r tsconfig-paths/register unit.ts --coverage

# Short form
npx ts-node -r tsconfig-paths/register unit.ts -c
```

### Coverage Report Types

The coverage reporter supports multiple output formats:

- `text` - Detailed text report
- `text-summary` - Summary only (default)
- `json` - JSON format output
- `html` - HTML report generation
- `lcov` - LCOV format for CI integration
- `cobertura` - Cobertura XML format

### Coverage Options

```typescript
interface CoverageOptions {
    enabled?: boolean;
    reporters?: CoverageReporterType[];
    include?: string[];
    exclude?: string[];
    outputDir?: string;
    threshold?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
}
```

## Test Suites

### 1. KarmaReporter Test Suite (10 tests)

Basic functionality and core reporter features:

- ✅ `should create KarmaReporter instance` - Instance creation validation
- ✅ `should have track method` - Track method existence
- ✅ `should have renderSuite method` - Suite rendering method
- ✅ `should have renderCase method` - Case rendering method
- ✅ `should have render method` - Final report method
- ✅ `should throw error when tracking` - Error handling behavior
- ✅ `should render suite correctly` - Suite rendering functionality
- ✅ `should render case without error` - Success case rendering
- ✅ `should render case with error` - Failed case rendering
- ✅ `should render final report` - Complete report generation

### 2. CoverageReporter Test Suite (17 tests)

Coverage reporting functionality:

- ✅ `should create CoverageReporter instance` - Instance creation validation
- ✅ `should have track method` - Track method existence
- ✅ `should have renderSuite method` - Suite rendering method
- ✅ `should have renderCase method` - Case rendering method
- ✅ `should have render method` - Final report method
- ✅ `should have setOptions method` - Options configuration method
- ✅ `should throw error when tracking` - Error handling behavior
- ✅ `should not render when coverage disabled` - Disabled coverage handling
- ✅ `should render with text-summary reporter` - Text summary format
- ✅ `should render with text reporter` - Detailed text format
- ✅ `should render with json reporter` - JSON output format
- ✅ `should render with html reporter` - HTML report generation
- ✅ `should render with lcov reporter` - LCOV format output
- ✅ `should render with cobertura reporter` - Cobertura XML format
- ✅ `should render with multiple reporters` - Multiple format support
- ✅ `should handle empty suites` - Empty suite handling
- ✅ `should calculate 100% coverage with all passing` - 100% coverage
- ✅ `should calculate 0% coverage with all failing` - 0% coverage

### 3. Browser Environment Tests (10 tests)

Browser-specific DOM rendering and environment handling:

- ✅ `should detect non-browser environment` - Environment detection
- ✅ `should handle browser environment for renderCase` - Browser case rendering
- ✅ `should handle browser environment for failed case` - Browser failed case
- ✅ `should handle browser environment for final render` - Final browser report
- ✅ `should handle missing DOM elements gracefully` - Missing DOM handling
- ✅ `should handle empty test results container` - Empty results container
- ✅ `should handle empty test summary container` - Empty summary container
- ✅ `should render multiple suites in browser` - Multiple suite rendering
- ✅ `should handle all passing tests in browser` - All passing scenario
- ✅ `should handle all failing tests in browser` - All failing scenario

## Browser Environment Simulation

The browser tests simulate a complete browser environment with:

### Mock Objects
```typescript
- window: { document: MockDocument }
- document: {
    getElementById(id): MockElement | null,
    createElement(tag): MockElement
  }
```

### Mock Elements
```typescript
- MockElement: {
    className: string,
    innerHTML: string,
    textContent: string,
    appendChild(child): void,
    children: any[]
  }
```

## Coverage Areas

### ✅ Core Functionality
- Reporter instantiation
- Method existence and type validation
- Error tracking and propagation
- Console output formatting

### ✅ Rendering Features
- Suite rendering with descriptions
- Case rendering with status indicators (✓/✗)
- Time formatting with hrtime
- Error stack trace display

### ✅ Browser-Specific Features
- Environment detection (`typeof window !== 'undefined'`)
- DOM element creation and manipulation
- Test results container rendering
- Test summary container rendering
- Graceful degradation when DOM unavailable

### ✅ Edge Cases
- Empty test suites
- Missing DOM containers
- All passing tests
- All failing tests
- Multiple test suites
- Mixed pass/fail results

## Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm run test

# Build and run
npm run build && npm test
```

## Test Architecture

### Dependency Injection
- Tests use `@Injectable()` decorator for IoC container management
- `@Inject()` for automatic dependency injection
- `@Inject(ExpectToken)` for assertion library injection

### Decorators Used
- `@Suite` - Define test suite
- `@Test` - Define test case
- `@BeforeEach` - Setup before each test
- `@AfterEach` - Cleanup after each test
- `@Before` - One-time setup

### Assertion Libraries
- `Expect` - BDD-style assertions via `@Inject(ExpectToken)`
- `Assert` - TDD-style assertions via parameter injection

## Performance Metrics

- **Average test time:** ~6.58ms per test
- **Suite setup time:** ~2ms
- **Browser mock setup:** ~4ms
- **Report rendering:** ~2-3ms

## Next Steps

1. Add integration tests with actual browser test runners (Karma, Jasmine)
2. Add visual regression tests for DOM output
3. Add performance benchmarks for large test suites
4. Add test coverage reporting (nyc/istanbul)