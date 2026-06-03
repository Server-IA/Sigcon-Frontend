import JSZip from 'jszip';

/**
 * QA CXP (2026-06-02): generador de archivos .xlsx REALES (OOXML) en el navegador.
 *
 * <p>Antes los reportes (AP, Activos) se exportaban como "HTML-table-as-Excel"
 * con MIME {@code application/vnd.ms-excel} y extension {@code .xls}. Excel
 * moderno (2016+) detecta que el contenido es HTML y NO un binario XLS, y muestra
 * el aviso: <i>"El formato y la extension de archivo no coinciden. Puede que el
 * archivo este danado..."</i>. Ademas el HTML arrastra problemas de codificacion.
 *
 * <p>Este helper construye un paquete OOXML valido (zip con
 * {@code [Content_Types].xml}, {@code workbook.xml}, {@code sheet1.xml}, etc.)
 * usando JSZip (ya presente en el proyecto). Excel lo abre SIN aviso, con UTF-8
 * nativo (sin tildes rotas) y numeros como celdas numericas reales.
 *
 * <p>Uso:
 * <pre>
 *   const blob = await buildRealXlsx('Reporte OCs', [
 *     { heading: 'Resumen', headers: ['Estado','Cantidad','Monto'], rows: [['APROBADA', 3, 2550000]] },
 *     { heading: 'Detalle', headers: ['# Orden','Proveedor','Total'], rows: [...] },
 *   ]);
 *   triggerDownload(blob, 'reporte_ocs_2026-06-02.xlsx');
 * </pre>
 */

/** Escapa un valor para XML + normaliza el espacio duro (NBSP) del formato moneda es-CO. */
const xmlEsc = (s) => {
    const str = String(s == null ? '' : s);
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // NBSP / narrow NBSP del formato moneda es-CO -> espacio normal
        if (code === 0xA0 || code === 0x202F) { out += ' '; continue; }
        // descartar caracteres de control no validos en XML 1.0 (permite tab/LF/CR)
        if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) { continue; }
        const ch = str[i];
        if (ch === '&') out += '&amp;';
        else if (ch === '<') out += '&lt;';
        else if (ch === '>') out += '&gt;';
        else if (ch === '"') out += '&quot;';
        else if (ch === "'") out += '&apos;';
        else out += ch;
    }
    return out;
};

/** Indice de columna 0-based -> nombre de columna Excel (A, B, ..., Z, AA, AB...). */
const colName = (n) => {
    let s = '';
    n += 1;
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** Construye el XML de las filas (1-based) a partir de un array de arrays. */
const buildRowsXml = (rows) => {
    let xml = '';
    rows.forEach((row, ri) => {
        const r = ri + 1;
        let cells = '';
        (row || []).forEach((val, ci) => {
            const ref = colName(ci) + r;
            if (isFiniteNumber(val)) {
                cells += `<c r="${ref}"><v>${val}</v></c>`;
            } else if (val === null || val === undefined || val === '') {
                // celda vacia: se omite (Excel la trata como blanco)
            } else {
                cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(val)}</t></is></c>`;
            }
        });
        xml += `<row r="${r}">${cells}</row>`;
    });
    return xml;
};

/**
 * Construye un Blob .xlsx REAL a partir de secciones.
 *
 * @param {string} sheetName nombre de la hoja (se sanea a <=31 chars sin caracteres invalidos)
 * @param {Array<{heading?:string, headers?:string[], rows?:Array<Array<string|number|null>>}>} sections
 * @returns {Promise<Blob>} blob xlsx valido
 */
export async function buildRealXlsx(sheetName, sections) {
    const zip = new JSZip();

    // Aplanar las secciones en filas: [blank] heading, headers, ...rows
    const allRows = [];
    (sections || []).forEach((sec, idx) => {
        if (idx > 0) allRows.push([]); // separador entre secciones
        if (sec && sec.heading) allRows.push([sec.heading]);
        if (sec && sec.headers && sec.headers.length) allRows.push(sec.headers);
        (sec && sec.rows ? sec.rows : []).forEach((r) => allRows.push(r));
    });

    const sheetData = buildRowsXml(allRows);
    const safeName = String(sheetName || 'Datos')
        .replace(/[\\/?*[\]:]/g, '')
        .slice(0, 31) || 'Datos';

    zip.file('[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>');

    zip.file('_rels/.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>');

    zip.file('xl/workbook.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${xmlEsc(safeName)}" sheetId="1" r:id="rId1"/></sheets>` +
        '</workbook>');

    zip.file('xl/_rels/workbook.xml.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>');

    zip.file('xl/worksheets/sheet1.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${sheetData}</sheetData></worksheet>`);

    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

export default buildRealXlsx;
