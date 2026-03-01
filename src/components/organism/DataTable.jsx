import '../../../public/assets/vendor/libs/flatpickr/flatpickr.css';

import esES from '../../jsons/languaje/es-ES-DataTable.json';

import { useEffect, useRef, useState } from "react";

import { default_buttons } from '../../utils/dataTable';
import { useSelector } from 'react-redux';

import { base_redirect_path, base_url } from '../../utils/functions';
import { fetchHelper } from '../../utils/fetch';

const DataTableReference = ({ url_api, columns, method = 'GET', tableRef, dataTableRef, buttons, title, setData, filtered = false, search = {
    value: '',
    checked: true,
}, setSearch = () => {}, data = [], lengthMenu = [10, 25, 50, 75, 100], requestWrapper = null}) => {
    
    const token = useSelector(state => state.user.token);
    const requestWrapperRef = useRef(requestWrapper);
    useEffect(() => { requestWrapperRef.current = requestWrapper; }, [requestWrapper]);

    useEffect(() => {
        if (!tableRef?.current || !dataTableRef) return;

        const config = {
            dom: 'r<"row"<"col-sm-12 col-md-12 col-lg-4 mt-3 mt-md-0 d-flex justify-content-center justify-content-lg-start justify-content-md-center align-items-center"l><"col-sm-12 col-md-12 col-lg-8 d-flex justify-content-center justify-content-lg-end justify-content-md-center align-items-center"<"dt-action-buttons text-end pt-0 pt-md-0"B>>>t<"row"<"col-sm-12 col-md-6 text-wrap"i><"col-sm-12 col-md-6 d-flex justify-content-center justify-content-lg-end align-items-center"p>>',
            lengthMenu: lengthMenu,
            columns: columns,
            destroy: true,
            responsive: false,
            scrollX: true,
            scrollY: false,
            ordering: false,
            processing: true,
            serverSide: data.length === 0,
            drawCallback: function(settings) {
                if (setData) {
                    setData(settings.json.data);
                }
            },
            initComplete: function(settings) {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });  
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
                        // {
                        //     text: '<span class="fw-bold text-primary">Configuración</span>',
                        //     className: 'dropdown-header',
                        //     action: function(){ return false; }
                        // },
                        // {
                        //     extend: 'colvis',
                        //     text: '<i class="ri-eye-line me-1"></i> Mostrar / Ocultar Columnas',
                        //     className: 'dropdown-item'
                        // },
                        // {
                        //     extend: 'colvisRestore',
                        //     text: '<i class="ri-refresh-line me-1"></i> Restaurar Columnas',
                        //     className: 'dropdown-item'
                        // },
            
                        // // Separator visual
                        // {
                        //     text: '<hr class="dropdown-divider m-1">',
                        //     className: 'dt-divider',
                        //     action: function(){ return false; }
                        // },
            
                        // ==== SECCIÓN: REPORTES ====
                        {
                            text: '<span class="fw-bold text-primary">Exportar Información</span>',
                            className: 'dropdown-header',
                            action: function(){ return false; }
                        },
                        
                        ...default_buttons(url_api, title)
                    ]
                },
            
                ...buttons
            ]
        }
        if(data.length > 0){
            config.data = data;
        }else{
            config.ajax = async function(data, callback, settings) {
                try {
                    const requestData = requestWrapperRef.current ? requestWrapperRef.current(data) : data;
                    const response = await fetchHelper.post(base_url(url_api), requestData, {}, 0);
                    callback(response);

                }catch(error){
                    console.log("Error en DataTable: ", error);
                    callback({
                        data: [],
                        recordsTotal: 0,
                        recordsFiltered: 0
                    })
                    if(error.status === 403){
                        
                        // console.log("Error 403");
                        
                        $(tableRef.current).html(`
                            <tbody>
                                <tr>
                                    <td colspan="${columns.length}" class="text-center text-danger py-5">
                                        <i class="ri-lock-line fs-2 d-block mb-2"></i>
                                        ${error.message || error.msg || 'No tiene permisos para ver esta información'}
                                    </td>
                                </tr>
                            </tbody>
                        `);
                    }
                    return;
                }
            }
        }
        // Inicializar DataTable
        dataTableRef.current = $(tableRef.current).DataTable(config);

        // Cleanup (MUY IMPORTANTE)
        return () => {
            if (window.bootstrap && window.bootstrap.Tooltip) {
                // Buscar y destruir todos los tooltips asociados a la tabla
                const table = dataTableRef.current?.table?.().node?.() || dataTableRef.current?.context?.[0]?.nTable;
                if (table) {
                    // Buscar todos los elementos con tooltip dentro de la tabla
                    const tooltipElements = table.querySelectorAll('[data-bs-toggle="tooltip"]');
                    tooltipElements.forEach(el => {
                        const tooltipInstance = window.bootstrap.Tooltip.getInstance(el);
                        if (tooltipInstance) {
                            tooltipInstance.dispose();
                        }
                    });
                }
            }
            if (dataTableRef?.current) {
                dataTableRef.current.destroy();
            }
        };
    }, [tableRef]);

    useEffect(() => {
        if (!dataTableRef?.current) return;
        dataTableRef.current.table().search(search.value, search.checked, true);
    }, [search]);

    const handleFilter = () => {
        if (!dataTableRef?.current) return;
        dataTableRef.current.table().columns().search('');
        dataTableRef.current.table().search(search.value, search.checked, true).draw();
    }

    return (
        <>
            {filtered && <div className="input-group">
                <div className="input-group-text form-check mb-0">
                    <input
                    checked={search.checked}
                    className="form-check-input m-auto"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    data-bs-original-title="Busqueda por coincidencia"
                    type="checkbox"
                    onChange={(e) => {
                        setSearch({ ...search, checked: e.target.checked });
                    }}
                    disabled={!dataTableRef?.current}
                    aria-label="Buscar" />
                </div>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Filtrar"
                    aria-label="Buscar"
                    disabled={!dataTableRef?.current}
                    value={search.value}
                    onChange={(e) => {
                        setSearch({ ...search, value: e.target.value });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleFilter();
                        }
                    }}
                />
                <button
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={
                        () => {
                            setSearch({ ...search, value: '' });
                            handleFilter();
                        }   
                    }
                    disabled={!dataTableRef?.current}
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    data-bs-custom-class="tooltip-danger"
                    data-bs-original-title="Limpiar filtro"
                >
                    <i className="ri-delete-back-line"></i>
                </button>
                <button
                    className="btn btn-outline-primary"
                    type="button"
                    onClick={handleFilter}
                    disabled={!dataTableRef?.current}
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    data-bs-custom-class="tooltip-primary"
                    data-bs-original-title="Filtrar"
                >
                    <i className="ri-filter-3-fill"></i>
                </button>
            </div>}
            <table ref={tableRef} className="datatables-ajax table table-bordered"></table>
        </>
    );
};

export default DataTableReference;