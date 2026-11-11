# @tsdi/microservice-contract

Contract-first generation for `@tsdi` microservices. One JSON manifest produces:

- TypeScript DTO classes (or interfaces), optionally with Swagger decorators.
- OpenAPI 3 document (schemas, paths, parameters, request/response bodies).
- proto3 messages and a unary RPC service (HTTP method/path kept as comments).

The reverse direction is supported too: import an existing OpenAPI 3 document or
a proto3 file back into a contract manifest.

The manifest is transport-neutral, so the same model drives HTTP/OpenAPI and
gRPC/proto contracts without duplicating DTO definitions.

## Manifest

```json
{
  "name": "orders",
  "title": "Orders API",
  "version": "1.0.0",
  "service": { "name": "OrdersService", "package": "shop.orders" },
  "models": {
    "CreateOrder": {
      "fields": {
        "id": { "type": "string", "required": true, "format": "uuid" },
        "quantity": { "type": "integer", "required": true },
        "status": { "type": "string", "enum": ["new", "paid"] },
        "items": { "type": "array", "items": { "type": "OrderItem" } }
      }
    },
    "OrderItem": {
      "fields": {
        "sku": { "type": "string", "required": true },
        "price": { "type": "number" }
      }
    }
  },
  "routes": [
    {
      "method": "post",
      "path": "/orders",
      "operationId": "createOrder",
      "request": "CreateOrder",
      "response": "Order",
      "errors": [400]
    }
  ]
}
```

Field types: `string` / `number` / `integer` / `boolean` / `array` / `object`,
or any model name declared in `models`. `array` requires `items`; `object` can
declare inline `properties`.

## CLI

From this package:

```bash
# default output: ./contract/{dto.ts, openapi.json, <name>.proto}
npm run generate -- example/orders.contract.json

# explicit output and decorators
npm run generate -- example/orders.contract.json --out src/contract --decorators

# CI drift check
npm run generate -- example/orders.contract.json --out src/contract --check

# Import an existing contract into a manifest
npm run generate -- --from-openapi openapi.json --manifest contract.json
npm run generate -- --from-proto orders.proto --manifest contract.json
```

Options:

| Option | Description |
|---|---|
| `--out <dir>` | output directory (default `contract`) |
| `--dto <file>` | DTO path (default `<out>/dto.ts`) |
| `--openapi <file>` | OpenAPI path (default `<out>/openapi.json`) |
| `--proto <file>` | proto path (default `<out>/<name>.proto`) |
| `--decorators` | add `@ApiModelProperty` decorators to DTO classes |
| `--interface` | generate interfaces instead of classes |
| `--proto-package <pkg>` | override the proto package |
| `--from-openapi <file>` | import an OpenAPI 3 document into a manifest |
| `--from-proto <file>` | import a proto3 file into a manifest |
| `--manifest <file>` | imported manifest output (default `<name>.contract.json`) |
| `--check` | fail when files on disk differ from generated output |

## Generated output

DTO:

```ts
export class CreateOrder {
    id!: string;
    quantity!: number;
    status?: "new" | "paid";
    items?: Array<OrderItem>;
}
```

OpenAPI:

```json
{
  "openapi": "3.0.2",
  "paths": {
    "/orders": {
      "post": {
        "requestBody": {
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateOrder" } } }
        },
        "responses": { "200": { "$ref": "#/components/schemas/Order" } }
      }
    }
  }
}
```

Proto:

```proto
message CreateOrder {
    string id = 1;
    int64 quantity = 2;
    optional string status = 3; // enum: new, paid
    repeated OrderItem items = 4;
}

service OrdersService {
    // HTTP POST /orders
    rpc CreateOrder (CreateOrder) returns (Order);
}
```

Routes without a request/response use a generated `Empty` message. Inline object
fields become nested messages named `<Model><Field>`; inline enums stay scalar
with the allowed values recorded as a comment (DTO/OpenAPI keep the actual
union/enum).

## Programmatic API

```ts
import {
    generateContract,
    importOpenApi,
    importProto,
    validateContract
} from '@tsdi/microservice-contract';

const errors = validateContract(manifest);
const { dto, openapi, proto } = generateContract(manifest, {
    dtoStyle: 'class',
    decorators: true
});

const fromOpenApi = importOpenApi(openapiDocument, { name: 'orders' });
const fromProto = importProto(protoText, { name: 'orders' });
```

Import supports the subset emitted by this package (object schemas, `$ref`,
arrays, enums, request/response bodies, unary RPCs and HTTP comments) plus
common hand-written variants. Nested proto messages are imported as standalone
models that reference each other.

`generateContract` throws `ContractValidationError` with unknown types, missing
array item schemas, duplicate routes or duplicate operation ids.

## Tests

```bash
npm test
```

Covers validation, DTO (classes/interfaces/decorators + TypeScript syntax),
OpenAPI paths/schemas/parameters, proto messages/nested objects/repeated fields,
the generated RPC service, and OpenAPI/proto → manifest round-trips.
