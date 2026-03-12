export const base_url = (array = [], get = {}) => {

    let base = `${import.meta.env.VITE_API_URL || 'https://api.inmero.co/sigcon/dev/'}`;

    // Quitar slash final de la base
    base = base.replace(/\/+$/, '');

    // Construir path sin slash inicial
    const path = array.length > 0
        ? array.join('/').replace(/^\/+/, '')
        : '';

    const query = Object.entries(get)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    const urlFinal = path ? `${base}/${path}` : base;

    return query ? `${urlFinal}?${query}` : urlFinal;
}


export const base_redirect_path = (is_login = false) => {
    const joinPath = (...parts) =>
        parts.join('/').replace(/\/+/g, '/')

    const base = import.meta.env.VITE_ENVIRONMENT == 'local'
        ? '/' : import.meta.env.VITE_ENVIRONMENT == 'development'
            ? '/sigcon/dev/' : '/sigcon/'

    return is_login
        ? joinPath(base, '/login')
        : joinPath(base, '/dashboard')
}

export const validarArrays = (a, b) => {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    return sortedA.every((value, index) => value === sortedB[index]);
}


export const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

export function lightenColor(hex, percent = 75) {
    // Quitar #
    hex = hex.replace("#", "");

    // Convertir a RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Mezclar con blanco
    r = Math.round(r + (255 - r) * (percent / 100));
    g = Math.round(g + (255 - g) * (percent / 100));
    b = Math.round(b + (255 - b) * (percent / 100));

    // Convertir de nuevo a HEX
    return (
        "#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
    );
}

export function formatPrice(price, currency = 'COP', locale = 'es-CO', minimumFractionDigits = 0){
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: minimumFractionDigits
    })
    return formatter.format(price)
}