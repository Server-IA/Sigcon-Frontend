import '../../styles/vendor/datatables-bs5/datatables.bootstrap5.css'
import '../../styles/vendor/flatpickr/flatpickr.css';
import '../../styles/vendor/datatables-bs5/datatables-bootstrap5.js';
import 'https://cdn.datatables.net/buttons/2.4.2/js/buttons.colVis.min.js';

import esES from '../../jsons/languaje/es-ES-DataTable.json';

import { useEffect, useRef } from "react";

import { base_url } from '../../utils/functions';
import { default_buttons } from '../../utils/dataTable';
import { useSelector } from 'react-redux';

const DataTableReference = ({ url_api, columns, method = 'GET', tableRef, dataTableRef, buttons, title, setData }) => {
    
    const token = useSelector(state => state.user.token);

    useEffect(() => {
        if (!tableRef?.current || !dataTableRef) return;
        // Inicializar DataTable
        dataTableRef.current = $(tableRef.current).DataTable({
            ajax: {
                url: base_url(url_api),
                dataSrc: 'data',
                type: method || 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                contentType: 'application/json',
                data: function (d) {
                    return JSON.stringify(d);
                },
                error: function (xhr, error, thrown) {
                    if(xhr.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');

                        window.Swal.fire({
                            title: 'Error',
                            text: 'Sesión expirada',
                            icon: 'error',
                            showConfirmButton: false,
                            allowOutsideClick: false,
                        });

                        window.location.href = '/login';
                    }
                }
            },
            dom: 'r<"row"<"col-sm-12 col-md-12 col-lg-4 mt-3 mt-md-0 d-flex justify-content-center justify-content-lg-start justify-content-md-center align-items-center"l><"col-sm-12 col-md-12 col-lg-8 d-flex justify-content-center justify-content-lg-end justify-content-md-center align-items-center"<"dt-action-buttons text-end pt-0 pt-md-0"B>>>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
            lengthMenu: [10, 25, 50, 75, 100],
            columns: columns,
            destroy: true,
            responsive: false,
            scrollX: true,
            scrollY: false,
            ordering: false,
            processing: true,
            serverSide: true,
            drawCallback: function(settings) {
                if (setData) {
                    setData(settings.json.data);
                }
            },
            language: esES,
            buttons: [
                {
                    extend: 'collection',
                    className: 'btn rounded-pill btn-label-primary waves-effect mx-2 my-2 dropdown-toggle',
                    text: '<i class="ri-apps-2-line me-sm-1"></i> <span class="d-none d-sm-inline-block">Opciones</span>',
                    autoClose: false,
                    buttons: [
                        // ==== SECCIÓN: CONFIGURACIÓN ====
                        {
                            text: '<span class="fw-bold text-primary">Configuración</span>',
                            className: 'dropdown-header',
                            action: function(){ return false; }
                        },
                        {
                            extend: 'colvis',
                            text: '<i class="ri-eye-line me-1"></i> Mostrar / Ocultar Columnas',
                            className: 'dropdown-item'
                        },
                        {
                            extend: 'colvisRestore',
                            text: '<i class="ri-refresh-line me-1"></i> Restaurar Columnas',
                            className: 'dropdown-item'
                        },
            
                        // Separator visual
                        {
                            text: '<hr class="dropdown-divider m-1">',
                            className: 'dt-divider',
                            action: function(){ return false; }
                        },
            
                        // ==== SECCIÓN: REPORTES ====
                        {
                            text: '<span class="fw-bold text-primary">Reportes</span>',
                            className: 'dropdown-header',
                            action: function(){ return false; }
                        },
                        
                        ...default_buttons(url_api, title)
                    ]
                },
            
                ...buttons
            ]
        });

        // Cleanup (MUY IMPORTANTE)
        return () => {
            if (dataTableRef?.current) {
                dataTableRef.current.destroy();
            }
        };
    }, [tableRef]);
    return (
        <table ref={tableRef} className="datatables-ajax table table-bordered"></table>
    )
}

export default DataTableReference;