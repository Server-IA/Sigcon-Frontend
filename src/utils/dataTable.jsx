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

export const exportConfig = {
    format: {
        body: function (inner, coldex, rowdex) {
            if (inner.length <= 0) return inner;
            var el = $.parseHTML(inner);
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
            return result;
        }
    }
};
        
export const default_buttons = (url_api, title, exportOptions = {}) => {
    const { method = 'POST', params = {} } = exportOptions;
    const buttons = [
        {
            extend: 'excel',
            text: '<i class="ri-file-excel-line me-1"></i>  Excel',
            className: `dropdown-item`,
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
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
            className: 'dropdown-item',
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
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
            className: 'dropdown-item',
            filename: `Reporte_${title.replace(/\s+/g, "_").toLowerCase()}`,
            title: `Reporte de ${title}`,
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
