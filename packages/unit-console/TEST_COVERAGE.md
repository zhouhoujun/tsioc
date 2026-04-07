# @tsdi/unit-console Test Coverage

## Test Summary

**Total Tests:** 33 passing
**Execution Time:** ~69-167ms
**Test Files:** 2

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

- `text` - Detailed text report with color-coded coverage
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

### Color-Coded Coverage

Coverage is displayed with color coding:
- **Green** (>= 80%): High coverage
- **Yellow** (60-79%): Medium coverage  
- **Red** (< 60%): Low coverage

## Test Suites

### 1. ConsoleReporter Test Suite (11 tests)

Basic functionality and console output features:

- ✅ `should create ConsoleReporter instance`
- ✅ `should have track method`
- ✅ `should have renderSuite method`
- ✅ `should have renderCase method`
- ✅ `should have render method`
- ✅ `should throw error when tracking`
- ✅ `should render suite correctly`
- ✅ `should render case without error`
- ✅ `should render case with error`
- ✅ `should render final report with all passing`
- ✅ `should handle multiple suites`
- ✅ `should handle empty suites`

### 2. CoverageReporter Test Suite (19 tests)

Coverage reporting functionality:

- ✅ `should create CoverageReporter instance`
- ✅ `should have track method`
- ✅ `should have renderSuite method`
- ✅ `should have renderCase method`
- ✅ `should have render method`
- ✅ `should have setOptions method`
- ✅ `should throw error when tracking`
- ✅ `should not render when coverage disabled`
- ✅ `should render with text-summary reporter`
- ✅ `should render with text reporter`
- ✅ `should render with json reporter`
- ✅ `should render with html reporter`
- ✅ `should render with lcov reporter`
- ✅ `should render with cobertura reporter`
- ✅ `should render with multiple reporters`
- ✅ `should handle empty suites`
- ✅ `should calculate 100% coverage with all passing`
- ✅ `should calculate 0% coverage with all failing`
- ✅ `should show high coverage with green color`
- ✅ `should show medium coverage with yellow color`
- ✅ `should show low coverage with red color`

## Chalk Integration

Both reporters use chalk for colored console output:

### ConsoleReporter
- Green checkmarks (✓) for passing tests
- Red X marks (✗) for failing tests
- Gray text for test titles and timing

### CoverageReporter
- Green/Yellow/Red coverage percentages based on threshold
- Bold headers for report sections
- Blue paths for output directories

## Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm run test

# Run with coverage
npm test -- --coverage

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

### Assertion Libraries
- `Expect` - BDD-style assertions via `@Inject(ExpectToken)`
- `Assert` - TDD-style assertions via parameter injection