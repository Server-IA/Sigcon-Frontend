/**
 * QA BNK (2026-06-03): validaciones de campos del modulo Bancos y Cajas.
 *
 * Fuente de verdad: documento "VALIDACIONES CAMPOS BNK Y CAJAS.docx" (matriz por
 * RF/campo con longitud minima, maxima y clase de caracteres permitidos).
 *
 * Diseno:
 *  - PATTERNS: regex Unicode (`\p{L}` con flag `u`) por clase de campo. Usar
 *    `\p{L}` cubre letras con acentos/enie de cualquier idioma sin enumerar
 *    tildes (mas robusto cross-encoding, leccion Bloque AQ).
 *  - validateText(value, opts): retorna un mensaje de error (string) o null.
 *  - validateNumber(value, opts): idem para campos numericos.
 *  - LABELS_MSG: mensaje legible por clase de caracteres (para el usuario).
 *
 * Convencion: los campos opcionales (min 0) que llegan vacios NO se validan de
 * patron ni de minimo; solo se valida el patron/min/max cuando hay contenido.
 */

/** Regex por clase de caracteres permitidos (documento de validaciones). */
export const PATTERNS = {
    // Numero de cuenta bancaria: digitos, guiones y espacios. Sin letras.
    accountNumber: /^[0-9\- ]+$/,
    // Nombre de cuenta / caja / proyeccion: letras (acentos), digitos, espacios,
    // puntos, guiones, guion bajo.
    name: /^[\p{L}0-9 ._-]+$/u,
    // Nombre de persona (ejecutivo de cuenta): letras (acentos), espacios y punto.
    // Sin numeros ni simbolos.
    personName: /^[\p{L} .]+$/u,
    // Descripcion / observaciones / motivo: letras, numeros, espacios, puntos,
    // comas, guiones, guion bajo.
    description: /^[\p{L}0-9 .,_-]+$/u,
    // Igual que descripcion + punto y coma.
    descriptionSemicolon: /^[\p{L}0-9 .,;_-]+$/u,
    // Codigo de banco: solo A-Z y 0-9 (se guarda en mayusculas). Sin guiones ni espacios.
    bankCode: /^[A-Z0-9]+$/,
    // Codigo de caja / chequera: letras (mayus/minus), numeros, guion, guion bajo.
    // Sin espacios ni simbolos.
    code: /^[A-Za-z0-9_-]+$/,
    // Nombre completo de banco: letras, numeros, espacios, puntos, comas, guiones,
    // ampersand, punto medio.
    bankFullName: /^[\p{L}0-9 .,&·_-]+$/u,
    // Nombre corto de banco: letras, numeros, espacios, puntos, guiones.
    bankShortName: /^[\p{L}0-9 .-]+$/u,
    // NIT: solo digitos y guion.
    nit: /^[0-9-]+$/,
    // SWIFT: solo letras mayusculas y numeros.
    swift: /^[A-Z0-9]+$/,
    // Codigo ACH: alfanumericos y guiones.
    ach: /^[A-Za-z0-9-]+$/,
    // Direccion / ubicacion fisica: letras, numeros, espacios, guiones, signo mas,
    // punto, numeral, barra, coma.
    address: /^[\p{L}0-9 .,#/+-]+$/u,
    // Beneficiario / concepto de cheque: letras, numeros, espacios, puntos, comas,
    // guiones, guion bajo, ampersand, punto medio.
    payee: /^[\p{L}0-9 .,&·_-]+$/u,
    // Referencia de cobro/externa: alfanumericos, espacios, guiones, puntos, barras.
    reference: /^[\p{L}0-9 ./-]+$/u,
    // Busqueda global (filtros): letras, numeros, espacios, guiones, %, coma, punto,
    // parentesis. Vacio permitido.
    search: /^[\p{L}0-9 %.,()-]*$/u,
};

/** Mensaje legible de "caracteres permitidos" por clase (para el usuario). */
export const PATTERN_MSG = {
    accountNumber: 'Solo se permiten dígitos, guiones y espacios',
    name: 'Solo se permiten letras, números, espacios, puntos, guiones y guion bajo',
    personName: 'Solo se permiten letras, espacios y punto (sin números ni símbolos)',
    description: 'Solo se permiten letras, números, espacios, puntos, comas, guiones y guion bajo',
    descriptionSemicolon: 'Solo se permiten letras, números, espacios y signos de puntuación básicos',
    bankCode: 'Solo se permiten letras (A-Z) y números, sin espacios ni símbolos',
    code: 'Solo se permiten letras, números, guion y guion bajo (sin espacios)',
    bankFullName: 'Solo se permiten letras, números, espacios, puntos, comas, guiones y &',
    bankShortName: 'Solo se permiten letras, números, espacios, puntos y guiones',
    nit: 'Solo se permiten dígitos y guion (ej: 900123456-1)',
    swift: 'Solo se permiten letras mayúsculas y números (ej: BBVAUS33XXX)',
    ach: 'Solo se permiten caracteres alfanuméricos y guiones',
    address: 'Solo se permiten letras, números, espacios, guiones, +, punto, # y /',
    payee: 'Solo se permiten letras, números, espacios y signos de puntuación básicos',
    reference: 'Solo se permiten letras, números, espacios, guiones, puntos y /',
    search: 'La búsqueda contiene caracteres no válidos',
};

/**
 * Valida un campo de texto contra longitud y clase de caracteres.
 *
 * @param {*} value valor del campo.
 * @param {object} opts
 *   - min {number} longitud minima (0 = opcional si vacio).
 *   - max {number} longitud maxima.
 *   - patternKey {string} clave de PATTERNS (clase de caracteres).
 *   - required {boolean} si es obligatorio (vacio -> error aunque min sea 0).
 *   - label {string} etiqueta del campo para el mensaje.
 * @returns {string|null} mensaje de error o null si es valido.
 */
export const validateText = (value, { min = 0, max, patternKey, required = false, label = 'El campo' } = {}) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
        if (required || min > 0) return `${label} es obligatorio`;
        return null; // opcional vacio: no se valida patron ni minimo
    }
    if (min > 0 && trimmed.length < min) {
        return `${label} debe tener al menos ${min} ${min === 1 ? 'carácter' : 'caracteres'}`;
    }
    if (max && raw.length > max) {
        return `${label} no puede superar los ${max} caracteres`;
    }
    if (patternKey && PATTERNS[patternKey] && !PATTERNS[patternKey].test(raw)) {
        return PATTERN_MSG[patternKey] || `${label} contiene caracteres no válidos`;
    }
    return null;
};

/**
 * Valida un campo numerico (monto, limite, dias, etc).
 *
 * @param {*} value valor del campo.
 * @param {object} opts
 *   - required {boolean}
 *   - min {number} valor minimo permitido.
 *   - max {number} valor maximo permitido.
 *   - integer {boolean} si debe ser entero.
 *   - gtZero {boolean} si debe ser > 0 cuando se informa.
 *   - decimals {number} maximo de decimales.
 *   - label {string}
 * @returns {string|null}
 */
export const validateNumber = (value, { required = false, min, max, integer = false, gtZero = false, decimals, label = 'El campo' } = {}) => {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    if (raw.length === 0) {
        return required ? `${label} es obligatorio` : null;
    }
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
        return `${label} debe ser un número válido`;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return `${label} debe ser un número válido`;
    if (integer && !Number.isInteger(n)) return `${label} debe ser un número entero`;
    if (gtZero && n <= 0) return `${label} debe ser mayor que cero`;
    if (min !== undefined && n < min) return `${label} no puede ser menor que ${min}`;
    if (max !== undefined && n > max) return `${label} no puede ser mayor que ${max}`;
    if (decimals !== undefined) {
        const dot = raw.indexOf('.');
        if (dot !== -1 && raw.length - dot - 1 > decimals) {
            return `${label} admite máximo ${decimals} decimales`;
        }
    }
    return null;
};

/**
 * Valida una fecha ISO (YYYY-MM-DD) opcionalmente no-futura.
 * @returns {string|null}
 */
export const validateDateNotFuture = (value, { required = false, label = 'La fecha' } = {}) => {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    if (raw.length === 0) return required ? `${label} es obligatoria` : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${label} debe tener formato AAAA-MM-DD`;
    const d = new Date(raw + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return `${label} no es una fecha válida`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d > today) return `${label} no puede ser una fecha futura`;
    return null;
};
