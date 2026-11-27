/**
 * OpenTelemetry semantic-convention helpers.
 *
 * The legacy `http.method`/`http.url`/`http.status_code` attributes are kept
 * for backward compatibility while new `http.*`/`url.*` names are emitted in
 * parallel during the migration window.
 */
export function httpSpanAttributes(
    method: string,
    url: string,
    options: {
        route?: string;
        scheme?: string;
        status?: number;
        serviceName?: string;
    } = {}
): Record<string, any> {
    const path = String(url || '/').split('?')[0] || '/';
    const attributes: Record<string, any> = {
        'http.method': method,
        'http.url': url,
        'http.request.method': method,
        'url.full': url,
        'url.path': path,
        'url.scheme': options.scheme ?? 'http'
    };
    if (options.route) {
        attributes['http.route'] = options.route;
    }
    if (options.serviceName) {
        attributes['service.name'] = options.serviceName;
    }
    if (options.status != null) {
        attributes['http.status_code'] = options.status;
        attributes['http.response.status_code'] = options.status;
    }
    return attributes;
}

/**
 * Broker/messaging attributes. `messaging.destination` is the legacy name;
 * `messaging.destination.name` is the current OTel semantic convention.
 */
export function messagingSpanAttributes(
    destination: string,
    system?: string
): Record<string, any> {
    return {
        'messaging.destination': destination,
        'messaging.destination.name': destination,
        ...(system ? { 'messaging.system': system } : {})
    };
}
