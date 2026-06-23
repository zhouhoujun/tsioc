# @tsdi/common/http

HTTP client support for TSDI applications.

## Recommended Usage

Prefer the provider-style API for new code:

```ts
import { provideHttpClient, withFetch } from '@tsdi/common/http';

const providers = [
  ...provideHttpClient(withFetch())
];
```

`provideHttpClient(...features)` is the primary public API.

## Features

Available feature helpers:

```ts
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
  withJsonpSupport,
  withNoXsrfProtection,
  withXhr,
  withXsrfConfiguration,
} from '@tsdi/common/http';
```

### Backend Selection

`XMLHttpRequest` is the default backend:

```ts
provideHttpClient();
provideHttpClient(withXhr());
```

Use `fetch` explicitly when needed:

```ts
provideHttpClient(withFetch());
```

### XSRF

Default XSRF names:

- cookie: `XSRF-TOKEN`
- header: `X-XSRF-TOKEN`

Customize:

```ts
provideHttpClient(
  withXsrfConfiguration({
    cookieName: 'CUSTOM-XSRF',
    headerName: 'X-CUSTOM-XSRF',
  })
);
```

Disable:

```ts
provideHttpClient(withNoXsrfProtection());
```

### Interceptors

Feature interceptors are the preferred option for new code:

```ts
provideHttpClient(
  withInterceptors([
    (req, next, context) => next(req, context)
  ])
);
```

To include class-based interceptors registered through the legacy
`HTTP_COMMON_INTERCEPTORS` multi-provider, opt in explicitly:

```ts
provideHttpClient(withInterceptorsFromDi());
```

When both are used, feature interceptors run before legacy DI interceptors.

### JSONP

Enable JSONP support explicitly:

```ts
provideHttpClient(
  withJsonpSupport()
);
```

Then use:

```ts
client.jsonp('/endpoint', 'callback');
```

## Legacy Module Compatibility

The module-based API is still supported for compatibility:

```ts
import {
  HttpClientJsonpModule,
  HttpClientModule,
  HttpClientXsrfModule,
} from '@tsdi/common/http';
```

Examples:

```ts
HttpClientModule
HttpClientModule.withOptions({ backend: 'fetch', xsrf: false })
HttpClientXsrfModule.withOptions({ cookieName: 'XSRF-TOKEN' })
HttpClientXsrfModule.disable()
HttpClientJsonpModule
```

`HttpClientModule.withOptions(...)` accepts `LegacyHttpClientOptions`.

For new code, prefer composing features directly instead of using legacy module options.

## Public Provider Exports

`@tsdi/common/http` publicly exports:

- `provideHttpClient`
- `provideLegacyHttpClientFeatures`
- `withFetch`
- `withXhr`
- `withInterceptors`
- `withInterceptorsFromDi`
- `withJsonpSupport`
- `withNoXsrfProtection`
- `withXsrfConfiguration`
- `HttpFeatureKind`
- `HttpFeature`
- `HttpClientBackendKind`
- `HttpXsrfOptions`
- `LegacyHttpClientOptions`
