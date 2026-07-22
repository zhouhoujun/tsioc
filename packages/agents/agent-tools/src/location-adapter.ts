import { ApplicationArguments } from '@tsdi/core';
import { Inject, Optional } from '@tsdi/ioc';
import { AgentToolsLocationOptions } from './options';
import { LocationAdapter, LocationResult } from '../utility/location.tool';

interface IpWhoIsLocationPayload {
    success?: boolean;
    message?: string;
    ip?: string;
    city?: string;
    region?: string;
    region_code?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    postal?: string;
    timezone?: {
        id?: string;
    } | string;
}

interface IpInfoLocationPayload {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    loc?: string;
    org?: string;
    postal?: string;
    timezone?: string;
}

interface IpApiCoLocationPayload {
    ip?: string;
    city?: string;
    region?: string;
    region_code?: string;
    country_name?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    postal?: string;
    timezone?: string;
    error?: boolean;
    reason?: string;
}

interface IpSbLocationPayload {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    postal_code?: string;
    timezone?: string;
}

export class IpWhoIsLocationAdapter extends LocationAdapter {
    protected fetchFn?: typeof fetch;
    protected timeoutMs: number;
    protected lookupUrl: string;
    protected userAgent: string;

    constructor(
        options: AgentToolsLocationOptions = {},
        @Optional() @Inject(ApplicationArguments) protected appArgs?: ApplicationArguments | null
    ) {
        super();
        this.fetchFn = options.fetch ?? globalThis.fetch?.bind(globalThis);
        this.timeoutMs = Math.max(1000, Number(options.timeoutMs || 15000));
        this.lookupUrl = String(options.lookupUrl || 'https://ipinfo.io/json').trim();
        this.userAgent = String(options.userAgent || 'tsdi-agent/6').trim();
    }

    override async getCurrentLocation(): Promise<LocationResult> {
        const errors: string[] = [];
        for (const request of this.buildLookupRequests()) {
            try {
                const payload = await this.requestJson<any>(request.url);
                const result = request.normalize(payload);
                if (result?.label?.trim()) {
                    return result;
                }
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }
        const timezoneFallback = this.resolveTimezoneFallback();
        if (timezoneFallback) {
            return timezoneFallback;
        }
        const detail = errors.length ? ` ${errors.join(' | ')}` : '';
        throw new Error(`Location service request failed.${detail}`.trim());
    }

    protected async requestJson<T>(url: string): Promise<T> {
        const fetchFn = this.fetchFn;
        if (!fetchFn) {
            throw new Error('Location service adapter requires a fetch implementation.');
        }
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : undefined;
        try {
            const response = await fetchFn(url, {
                method: 'GET',
                headers: this.userAgent ? { 'user-agent': this.userAgent } : undefined,
                signal: controller?.signal
            } as any);
            if (!response.ok) {
                throw new Error(`Location service request failed with status ${response.status}.`);
            }
            return await response.json() as T;
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    protected optionalNumber(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    protected optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    protected normalizeTimezone(value: IpWhoIsLocationPayload['timezone']): string | undefined {
        if (typeof value === 'string') {
            return this.optionalString(value);
        }
        return this.optionalString(value?.id);
    }

    protected buildLookupRequests(): Array<{ url: string; normalize(payload: any): LocationResult | null }> {
        const requests: Array<{ url: string; normalize(payload: any): LocationResult | null }> = [];
        const seen = new Set<string>();
        const add = (url: string, normalize: (payload: any) => LocationResult | null) => {
            const trimmed = String(url || '').trim();
            if (!trimmed || seen.has(trimmed)) {
                return;
            }
            seen.add(trimmed);
            requests.push({ url: trimmed, normalize });
        };

        add(this.lookupUrl, payload => this.normalizeIpInfoPayload(payload));
        add('https://ipwho.is/', payload => this.normalizeIpWhoIsPayload(payload));
        add('https://ipapi.co/json/', payload => this.normalizeIpApiCoPayload(payload));
        add('https://api.ip.sb/geoip', payload => this.normalizeIpSbPayload(payload));
        return requests;
    }

    protected normalizeIpInfoPayload(payload: IpInfoLocationPayload): LocationResult | null {
        const loc = this.parseLocationPair(payload?.loc);
        return this.buildResult({
            ip: payload?.ip,
            org: payload?.org,
            city: payload?.city,
            region: payload?.region,
            country: payload?.country,
            latitude: loc?.latitude,
            longitude: loc?.longitude,
            timezone: payload?.timezone,
            postalCode: payload?.postal
        });
    }

    protected normalizeIpWhoIsPayload(payload: IpWhoIsLocationPayload): LocationResult | null {
        if (payload?.success === false) {
            throw new Error(payload.message ? `Location service request failed: ${payload.message}` : 'Location service request failed.');
        }
        return this.buildResult({
            ip: payload?.ip,
            city: payload?.city,
            region: payload?.region,
            regionCode: payload?.region_code,
            country: payload?.country,
            countryCode: payload?.country_code,
            latitude: payload?.latitude,
            longitude: payload?.longitude,
            timezone: this.normalizeTimezone(payload?.timezone),
            postalCode: payload?.postal
        });
    }

    protected normalizeIpApiCoPayload(payload: IpApiCoLocationPayload): LocationResult | null {
        if (payload?.error) {
            throw new Error(payload.reason ? `Location service request failed: ${payload.reason}` : 'Location service request failed.');
        }
        return this.buildResult({
            ip: payload?.ip,
            city: payload?.city,
            region: payload?.region,
            regionCode: payload?.region_code,
            country: payload?.country_name,
            countryCode: payload?.country_code,
            latitude: payload?.latitude,
            longitude: payload?.longitude,
            timezone: payload?.timezone,
            postalCode: payload?.postal
        });
    }

    protected normalizeIpSbPayload(payload: IpSbLocationPayload): LocationResult | null {
        return this.buildResult({
            ip: payload?.ip,
            city: payload?.city,
            region: payload?.region,
            country: payload?.country,
            countryCode: payload?.country_code,
            latitude: payload?.latitude,
            longitude: payload?.longitude,
            timezone: payload?.timezone,
            postalCode: payload?.postal_code
        });
    }

    protected buildResult(input: {
        ip?: unknown;
        org?: unknown;
        city?: unknown;
        region?: unknown;
        regionCode?: unknown;
        country?: unknown;
        countryCode?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        timezone?: unknown;
        postalCode?: unknown;
    }): LocationResult | null {
        const city = this.optionalString(input.city);
        const region = this.optionalString(input.region);
        const country = this.optionalString(input.country);
        const label = [city, region, country].filter(Boolean).join(', ') || country;
        if (!label) {
            return null;
        }
        return {
            label,
            ip: this.optionalString(input.ip),
            org: this.optionalString(input.org),
            city,
            region,
            regionCode: this.optionalString(input.regionCode),
            country,
            countryCode: this.optionalString(input.countryCode),
            latitude: this.optionalNumber(input.latitude),
            longitude: this.optionalNumber(input.longitude),
            timezone: this.optionalString(input.timezone),
            postalCode: this.optionalString(input.postalCode)
        };
    }

    protected resolveTimezoneFallback(): LocationResult | null {
        const timezone = this.optionalString(this.appArgs?.timezone) ?? this.optionalString(process.env.TZ);
        if (!timezone || !timezone.includes('/')) {
            return null;
        }
        const city = this.extractTimezoneCity(timezone);
        if (!city) {
            return null;
        }
        const countryCode = this.extractLocaleRegionCode(this.appArgs?.locale) ?? this.extractLocaleRegionCode(process.env.LANG);
        const country = countryCode ? this.resolveRegionDisplayName(countryCode) : undefined;
        return {
            label: [city, country].filter(Boolean).join(', ') || city,
            city,
            country,
            countryCode,
            timezone
        };
    }

    protected parseLocationPair(value: unknown): { latitude?: number; longitude?: number } | null {
        const text = this.optionalString(value);
        if (!text) {
            return null;
        }
        const parts = text.split(',').map(item => item.trim());
        if (parts.length !== 2) {
            return null;
        }
        const latitude = Number(parts[0]);
        const longitude = Number(parts[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return { latitude, longitude };
    }

    protected extractTimezoneCity(timezone: string): string | undefined {
        const parts = timezone.split('/').filter(Boolean);
        const raw = parts[parts.length - 1];
        const normalized = this.optionalString(raw?.replace(/_/g, ' '));
        return normalized;
    }

    protected extractLocaleRegionCode(locale: unknown): string | undefined {
        const text = this.optionalString(locale);
        if (!text) {
            return undefined;
        }
        const match = text.match(/[-_](\w{2})(?:\.\w+)?$/);
        return match?.[1]?.toUpperCase();
    }

    protected resolveRegionDisplayName(regionCode: string): string | undefined {
        try {
            if (typeof Intl === 'undefined' || typeof (Intl as any).DisplayNames !== 'function') {
                return undefined;
            }
            const locale = this.optionalString(this.appArgs?.locale) || 'en';
            const display = new (Intl as any).DisplayNames([locale], { type: 'region' });
            return this.optionalString(display.of(regionCode));
        } catch {
            return undefined;
        }
    }
}
