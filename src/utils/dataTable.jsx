import { base_url } from './functions';

import { fetchHelper } from './fetch';

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
        
export const default_buttons = (url_api, title) => {
    const buttons = [
        {
            extend: 'excel',
            text: '<i class="ri-file-excel-line me-1"></i><span class="d-none d-sm-inline-block">Excel</span>',
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
                    length:         -1,
                }

                const url = base_url(url_api, getData);
                const {data: dataExport} = await fetchHelper.post(url, getData, {}, 0);

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
            text: '<i class="ri-file-text-line me-1"></i><span class="d-none d-sm-inline-block">CSV</span>',
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
                    length:         -1,
                }

                const url = base_url(url_api, getData);
                const {data: dataExport} = await fetchHelper.post(url, getData, {}, 0);

                // 🔹 Recargar datos temporalmente
                dt.clear();
                dt.rows.add(dataExport);
                dt.draw();
            
                $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
            }
        },
        {
            extend: 'pdf',
            text: '<i class="ri-file-pdf-2-line me-1"></i><span class="d-none d-sm-inline-block">PDF</span>',
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
                    length:         -1,
                }

                const url = base_url(url_api, getData);
                const {data: dataExport} = await fetchHelper.post(url, getData, {}, 0);

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
