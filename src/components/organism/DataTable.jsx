import "../../../public/assets/vendor/libs/flatpickr/flatpickr.css";

import esES from "../../jsons/languaje/es-ES-DataTable.json";

import { useEffect, useRef, useState } from "react";

import { default_buttons } from "../../utils/dataTable";
import { useSelector } from "react-redux";

import { base_redirect_path, base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

const DataTableReference = ({
  url_api = null,
  columns,
  method = "GET",
  tableRef,
  dataTableRef,
  buttons,
  title = '',
  setData,
  exportParams = {},
  exportMethod = "POST",
  filtered = false,
  search = {
    value: "",
    checked: true,
  },
  setSearch = () => {},
  data = [],
  lengthMenu = [10, 25, 50, 75, 100],
  filterColumns = [],
  // QA (2026-05-26): permite ocultar los botones de exportacion nativos
  // (Excel/CSV/PDF client-side) en las paginas que YA tienen exportacion
  // server-side curada (con encabezado empresa + totales). Evita botones
  // de exportacion duplicados reportados por el profesor.
  hideDefaultExport = false,
}) => {
  const token = useSelector((state) => state.user.token);
  // QA (2026-05-26): datos del usuario logueado para el encabezado estandar de
  // las exportaciones (empresa / generado por / fecha). Lo exige el profesor en
  // TODOS los formatos de exportacion del sistema.
  const sessionUser = useSelector((state) => state.user.user);

  // QA Bloque AU+ (2026-05-07) Bug 2: filterColumns se capturaba como closure
  // en config.ajax al INICIO. Cualquier cambio posterior del prop quedaba
  // ignorado y el reload usaba [] viejo. Con este ref leemos el valor actual
  // en cada llamada al ajax sin re-crear la tabla.
  const filterColumnsRef = useRef(filterColumns);
  useEffect(() => { filterColumnsRef.current = filterColumns; }, [filterColumns]);

  useEffect(() => {
    if (!tableRef?.current || !dataTableRef) return;
    
    // Metadata del encabezado estandar de exportacion (empresa / generado por).
    const reportMeta = {
      empresa: sessionUser?.companyName || '',
      nit: sessionUser?.companyNit || '',
      usuario: sessionUser?.email || sessionUser?.fullName || '',
      roles: Array.isArray(sessionUser?.roles) ? sessionUser.roles.join(', ') : '',
    };

    let api_back = url_api;
    let url_buttons = url_api;
    if(url_api !== null){
      const hasArray = url_api.some(item => Array.isArray(item));
      if(hasArray){
        url_buttons = url_api[0];
        api_back = base_url(...url_api);
      }else{
        api_back = base_url(url_api);
      }
    }

    const config = {
      dom: 'r<"row"<"col-sm-12 col-md-12 col-lg-4 mt-3 mt-md-0 d-flex justify-content-center justify-content-lg-start justify-content-md-center align-items-center"l><"col-sm-12 col-md-12 col-lg-8 d-flex justify-content-center justify-content-lg-end justify-content-md-center align-items-center"<"dt-action-buttons text-end pt-0 pt-md-0"B>>>t<"row"<"col-sm-12 col-md-6 text-wrap"i><"col-sm-12 col-md-6 d-flex justify-content-center justify-content-lg-end align-items-center"p>>',
      lengthMenu: lengthMenu,
      columns: columns,
      destroy: true,
      responsive: false,
      scrollX: true,
      scrollY: false,
      ordering: false,
      processing: api_back !== null,
      serverSide: api_back !== null,
      drawCallback: function (settings) {
        if (setData && data.length <= 0 && api_back !== null) {
          setData(settings.json.data);
        }
      },
      initComplete: function (settings) {
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll('[data-bs-toggle="tooltip"]'),
        );
        tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl);
        });
      },
      language: esES,
      buttons: [
        // QA (2026-05-25): se elimino el boton/dropdown "Opciones" que agrupaba
        // los formatos de exportacion. Ahora los botones de exportacion
        // (Excel / CSV / PDF) son DIRECTOS y visibles en la barra de acciones,
        // en TODOS los modulos (cambio en este organism compartido). El motor
        // de exportacion se conserva (trae todos los datos del backend y arma
        // el archivo con seleccion de columnas).
        ...(hideDefaultExport
            ? []
            : default_buttons(url_buttons, title, { method: exportMethod, params: exportParams }, reportMeta)),

        ...buttons,
      ],
    };

    if (data.length >= 0 && api_back === null) {
      config.data = data;
    } else {
      config.ajax = async function (data, callback, settings) {
        try {
          // QA Bloque AU+ (2026-05-07) Bug 2: leer filterColumns desde ref
          // (no del closure) para que cada reload tome los filtros actuales.
          const liveFilters = filterColumnsRef.current || [];
          const response = await fetchHelper.post(
            api_back,
            { ...data, columns: [...(data.columns || []), ...liveFilters] },
            {},
            0,
          );
          callback(response);
        } catch (error) {
          console.log("Error en DataTable: ", error);
          callback({
            data: [],
            recordsTotal: 0,
            recordsFiltered: 0,
          });
          if (error.status === 403 || error.msg === "Access Denied") {
            settings.oLanguage.sEmptyTable = `<span class="text-danger">
              <i class="ri-lock-line fs-2 d-block mb-2"></i> No tiene permisos para ver esta información</span>
            `;
          }else{
            settings.oLanguage.sEmptyTable = `<span class="text-danger">
              ${error.msg || error.message || 'No se encontraron datos'}
              </span>`;
          }

          return;
        }
      };
    }

    // Inicializar DataTable
    dataTableRef.current = $(tableRef.current).DataTable(config);

    // Cleanup (MUY IMPORTANTE)
    return () => {
      if (window.bootstrap && window.bootstrap.Tooltip) {
        // Buscar y destruir todos los tooltips asociados a la tabla
        const table =
          dataTableRef.current?.table?.().node?.() ||
          dataTableRef.current?.context?.[0]?.nTable;
        if (table) {
          // Buscar todos los elementos con tooltip dentro de la tabla
          const tooltipElements = table.querySelectorAll(
            '[data-bs-toggle="tooltip"]',
          );
          tooltipElements.forEach((el) => {
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
    dataTableRef.current.table().columns().search("");
    dataTableRef.current
      .table()
      .search(search.value, search.checked, true)
      .ajax.reload();
  };

  return (
    <>
      {filtered && (
        <div className="input-group">
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
              aria-label="Buscar"
            />
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
              if (e.key === "Enter") {
                handleFilter();
              }
            }}
          />
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={() => {
              // QA HU-007/013: el handleFilter usaba el state stale (setSearch
              // es async). Antes "Limpiar" dejaba la busqueda anterior aplicada.
              // Ahora limpiamos directo via la API de DataTables y luego
              // sincronizamos el state.
              setSearch({ ...search, value: "" });
              if (dataTableRef?.current) {
                dataTableRef.current.table().columns().search("");
                dataTableRef.current.table().search("").ajax.reload();
              }
            }}
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
        </div>
      )}
      <table
        ref={tableRef}
        className="datatables-ajax table table-bordered"
      ></table>
    </>
  );
};

export default DataTableReference;
