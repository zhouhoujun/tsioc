export type AdminPage = 'dashboard' | 'routes' | 'rules';

export function parseAdminRoute(hash: string | undefined): AdminPage {
    const value = String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
    return value === 'routes' || value === 'rules' ? value : 'dashboard';
}

export function adminRouteHash(page: AdminPage): string {
    return `#/${page}`;
}

export function safeAdminReturnTo(value: string | undefined, fallback = '/admin/'): string {
    const path = String(value || '');
    if (!path.startsWith('/admin/') || path.startsWith('//')) {
        return fallback;
    }
    return path;
}

export function buildAdminLoginUrl(returnTo: string | undefined, loginPage = '/admin/login.html'): string {
    const target = safeAdminReturnTo(returnTo);
    return `${loginPage}?redirect=${encodeURIComponent(target)}`;
}

export function redirectToAdminLogin(win?: { location?: Location }): void {
    const view = win ?? (globalThis as { window?: Window }).window;
    const location = view?.location;
    if (!location) {
        return;
    }
    let loginPage = '/admin/login.html';
    try {
        loginPage = new URL('login.html', location.href).pathname;
    } catch {
        // keep the default for non-standard hosts
    }
    const returnTo = `${location.pathname || '/admin/'}${location.search || ''}${location.hash || ''}`;
    const loginUrl = buildAdminLoginUrl(returnTo, loginPage);
    try {
        location.replace(loginUrl);
    } catch {
        location.href = loginUrl;
    }
}
