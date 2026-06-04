/**
 * QA CXC (2026-06-03): utilidades de sanitizacion de entrada numerica.
 *
 * Motivo: los `<input type="number">` NO garantizan "solo numeros" entre
 * navegadores. En Firefox el campo MUESTRA las letras tecleadas aunque su
 * `.value` quede vacio, lo que confunde al usuario (capturas de QA: "asdasdas"
 * en Monto, "aadasd" en Monto de nota). La solucion robusta cross-browser es
 * usar `type="text"` + `inputMode` adecuado y sanitizar en cada `onChange`,
 * dejando el value controlado por React como unica fuente de verdad del campo.
 */

/**
 * Deja solo digitos y un unico punto decimal. Para montos, precios, tasas, etc.
 * @param {*} raw valor crudo del input.
 * @returns {string} cadena saneada (solo numeros y un punto).
 */
export const sanitizeDecimal = (raw) => {
    if (raw === null || raw === undefined) return '';
    let s = String(raw).replace(/[^0-9.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
        // conservar el primer punto, eliminar puntos adicionales
        s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }
    return s;
};

/**
 * Deja solo digitos (sin punto). Para numeros enteros: consecutivos,
 * rangos de resolucion DIAN, etc.
 * @param {*} raw valor crudo del input.
 * @returns {string} cadena saneada (solo digitos 0-9).
 */
export const sanitizeInteger = (raw) => {
    if (raw === null || raw === undefined) return '';
    return String(raw).replace(/[^0-9]/g, '');
};
