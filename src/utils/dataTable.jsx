import { base_url } from './functions';

import { fetchHelper } from './fetch';

const normalizeExportData = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload && typeof payload === 'object') return [payload];
    return [];
};

export const sweetAlertExport = async (visibleColumns, dt) => {
    // 🔹 Armar HTML con checkboxes
    let html = '<div style="text-align:left">';
    visibleColumns.forEach(i => {
        const colTitle = dt.column(i).header().textContent.trim();
        // Última columna (acciones) la puedes excluir si quieres
        if (i !== visibleColumns[visibleColumns.length - 1] && colTitle != "") {
            html += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="col_${i}" value="${i}" checked>
                    <label class="form-check-label" for="col_${i}">${colTitle}</label>
                </div>`;
        }
    });
    html += '</div>';

    // 🔹 Mostrar SweetAlert con checkboxes
    const { value: selected } = await Swal.fire({
        title: 'Selecciona las columnas a exportar',
        html: html,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Exportar',
        preConfirm: () => {
            return [...document.querySelectorAll('input[type=checkbox]:checked')]
                .map(cb => parseInt(cb.value));
        }
    });

    return selected;
}

/**
 * QA CXP (2026-06-02): el formato de moneda es-CO (`toLocaleString` /
 * `Intl.NumberFormat`) inserta un ESPACIO DURO (NBSP U+00A0, y a veces el
 * NARROW NBSP U+202F) entre el simbolo y el numero ("$ 288.000,00").
 * Al exportar a CSV/Excel ese NBSP se ve como "$Â " cuando Excel ES abre el
 * archivo (lo interpreta como Windows-1252). Normalizar a espacio regular en
 * TODA exportacion del DataTable (CSV y Excel comparten exportConfig).
 */
const stripNbsp = (s) => String(s == null ? '' : s).replace(/[  ]/g, ' ');

export const exportConfig = {
    format: {
        body: function (inner, coldex, rowdex) {
            // QA-BLOQUE-AY (2026-05-05): manejo defensivo de tipos no-string.
            // Cuando la columna del DataTable expone valores numericos
            // (Integer/Long/Double, ej. Vida util en meses, Costo, Cantidad)
            // o booleanos sin render explicito, `inner` llega como number/bool
            // crudo. `$.parseHTML(12)` retorna array vacio y el export
            // descarta la celda silenciosamente. Convertir a String primero.
            if (inner === null || inner === undefined) return '';
            if (typeof inner === 'number' || typeof inner === 'boolean') {
                return stripNbsp(inner);
            }
            const innerStr = String(inner);
            if (innerStr.length <= 0) return stripNbsp(innerStr);
            var el = $.parseHTML(innerStr);
            if (!el || el.length === 0) return stripNbsp(innerStr);
            var result = '';
            $.each(el, function (index, item) {
                if (item.classList !== undefined && item.classList.contains('user-name')) {
                    result += item.lastChild.firstChild.textContent;
                } else if (item.innerText === undefined) {
                    result += item.textContent;
                } else {
                    result += item.innerText;
                }
            });
            return stripNbsp(result);
        }
    }
};
        
/**
 * QA (2026-05-26): el profesor exige que TODA exportacion (Excel/CSV/PDF) muestre
 * en su encabezado, como minimo: la empresa, quien la genero y la fecha de
 * generacion (y el total cuando aplica, lo aporta el backend en las exportaciones
 * server-side). Este helper arma ese bloque a partir del usuario logueado
 * (reportMeta lo inyecta el organism DataTable desde Redux). Se entrega como
 * funcion para que la fecha sea la del momento de exportar.
 */
const buildReportMessage = (reportMeta = {}) => () => {
    const { empresa, nit, usuario, roles } = reportMeta || {};
    const fecha = new Date().toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const empresaTxt = (empresa || '(empresa no configurada)') + (nit ? ` (NIT ${nit})` : '');
    const usuarioTxt = (usuario || '(sistema)') + (roles ? ` [${roles}]` : '');
    return `Empresa: ${empresaTxt}\nGenerado por: ${usuarioTxt}\nFecha de generacion: ${fecha}`;
};

export const default_buttons = (url_api, title, exportOptions = {}, reportMeta = {}) => {
    const { method = 'POST', params = {} } = exportOptions;
    // Bloque de encabezado estandar (empresa / generado por / fecha) para los 3 formatos.
    const messageTop = buildReportMessage(reportMeta);
    const buttons = [
        {
            extend: 'excel',
            text: '<i class="ri-file-excel-line me-1"></i> Excel',
            className: `btn rounded-pill btn-label-success waves-effect mx-1 my-2`,
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
            messageTop: messageTop,
            action: async function (e, dt, button, config) {
        
                // 🔹 Traer columnas visibles
                const visibleColumns = dt.columns(':visible').indexes().toArray();
        
                const selected = await sweetAlertExport(visibleColumns, dt)
        
                // Si no selecciona nada o cancela
                if (!selected || selected.length === 0) {
                    return;
                }

                config.exportOptions = {
                    ...exportConfig,
                    columns: selected
                };

                const getData = {
                    length: -1,
                    ...params,
                };

                const url = base_url(url_api, getData);
                const requestMethod = String(method || 'POST').toUpperCase();
                const response = requestMethod === 'GET'
                    ? await fetchHelper.get(url, {}, 0, false)
                    : await fetchHelper.post(url, getData, {}, 0);
                const dataExport = normalizeExportData(response?.data ?? response);

                // 🔹 Recargar datos temporalmente
                dt.clear();
                dt.rows.add(dataExport);
                dt.draw();
        
                // 🔹 Ejecutar exportación normal de Excel
                $.fn.dataTable.ext.buttons.excelHtml5.action.call(this, e, dt, button, config);
            }
        },
        {
            extend: 'csv',
            text: '<i class="ri-file-text-line me-1"></i> CSV',
            className: 'btn rounded-pill btn-label-info waves-effect mx-1 my-2',
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
            messageTop: messageTop,
            // QA (2026-05-26): el export CSV de DataTables NO honra messageTop
            // (solo Excel/PDF lo hacen). Prepend manual del encabezado estandar
            // (empresa / generado por / fecha) como filas iniciales del CSV.
            // QA CXP (2026-06-02): el boton csvHtml5 NO agrega BOM por defecto,
            // asi que Excel ES abre el archivo como Windows-1252 y las tildes
            // salen rotas ("PapelerÃ­a"). Prepend del BOM UTF-8 (﻿) para que
            // Excel detecte UTF-8 y muestre acentos correctamente.
            customize: function (csv) {
                const meta = messageTop();
                const head = ('Reporte de ' + title + '\n' + meta)
                    .split('\n')
                    .map(l => '"' + String(l).replace(/"/g, '""') + '"')
                    .join('\n');
                return '﻿' + head + '\n\n' + csv;
            },
            action: async function (e, dt, button, config) {
                // 🔹 Traer columnas visibles
                const visibleColumns = dt.columns(':visible').indexes().toArray();

                const selected = await sweetAlertExport(visibleColumns, dt)

                // Si no selecciona nada o cancela
                if (!selected || selected.length === 0) {
                    return;
                }

                config.exportOptions = {
                    ...exportConfig,
                    columns: selected
                };

                const getData = {
                    length: -1,
                    ...params,
                };

                const url = base_url(url_api, getData);
                const requestMethod = String(method || 'POST').toUpperCase();
                const response = requestMethod === 'GET'
                    ? await fetchHelper.get(url, {}, 0, false)
                    : await fetchHelper.post(url, getData, {}, 0);
                const dataExport = normalizeExportData(response?.data ?? response);

                // 🔹 Recargar datos temporalmente
                dt.clear();
                dt.rows.add(dataExport);
                dt.draw();

                $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
            }
        },
        {
            extend: 'pdf',
            text: '<i class="ri-file-pdf-2-line me-1"></i> PDF',
            className: 'btn rounded-pill btn-label-danger waves-effect mx-1 my-2',
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
            messageTop: messageTop,
            // HU-ACT-07 (QA 2026-05-05): orientacion horizontal + tamaño A3 para
            // tablas con muchas columnas (Activos = 11 columnas). Antes el PDF
            // salia cortado a la derecha.
            orientation: 'landscape',
            pageSize: 'A3',
            customize: function (doc) {
                if (doc && doc.defaultStyle) {
                    doc.defaultStyle.fontSize = 8;
                }
                if (doc && Array.isArray(doc.content)) {
                    doc.content.forEach((entry) => {
                        if (entry && entry.table) {
                            entry.table.widths = entry.table.body[0].map(() => '*');
                        }
                    });
                }
            },
            action: async function (e, dt, button, config) {
                // 🔹 Traer columnas visibles
                const visibleColumns = dt.columns(':visible').indexes().toArray();
            
                const selected = await sweetAlertExport(visibleColumns, dt)
        
                // Si no selecciona nada o cancela
                if (!selected || selected.length === 0) {
                    return;
                }

                config.exportOptions = {
                    ...exportConfig,
                    columns: selected
                };

                const getData = {
                    length: -1,
                    ...params,
                };

                const url = base_url(url_api, getData);
                const requestMethod = String(method || 'POST').toUpperCase();
                const response = requestMethod === 'GET'
                    ? await fetchHelper.get(url, {}, 0, false)
                    : await fetchHelper.post(url, getData, {}, 0);
                const dataExport = normalizeExportData(response?.data ?? response);

                // 🔹 Recargar datos temporalmente
                dt.clear();
                dt.rows.add(dataExport);
                dt.draw();
            
                $.fn.dataTable.ext.buttons.pdfHtml5.action.call(this, e, dt, button, config);
            }
        }
    ].filter(Boolean);

    return buttons;
}
