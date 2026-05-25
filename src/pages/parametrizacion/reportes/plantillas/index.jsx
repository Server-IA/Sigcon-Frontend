import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import DataTableReference from "../../../../components/organism/DataTable";

import { fetchHelper } from "../../../../utils/fetch";
import { base_url } from "../../../../utils/functions";
import { statusBadge } from "../../../../utils/statusLabels";

import CreateTemplate from "./create";
import AlertPage from "../../../../components/molecules/AlertPage";

/**
 * Pagina principal de CRUD para Plantillas de Reporte.
 * Muestra un DataTable con las columnas Id, Tipo de Reporte, Version, Descripcion, Estado y Acciones.
 * Permite crear y eliminar plantillas de reporte.
 */
const IndexReportTemplates = () => {
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);

  const [search, setSearch] = useState({
    value: "",
    checked: true,
  });

  const [data, setData] = useState([]);
  const [templateCreate, setTemplateCreate] = useState(false);
  const [templateDelete, setTemplateDelete] = useState(false);
  const [templateError, setTemplateError] = useState(false);

  const [reportTypes, setReportTypes] = useState([]);

  const url = ["api", "report-templates"];

  const actions = [
    {
      key: "download",
      icon: "ri-download-2-line",
      class: "btn-label-info",
      title: "Descargar archivo",
    },
    {
      key: "delete",
      icon: "ri-delete-bin-5-line",
      class: "btn-label-danger",
      title: "Eliminar",
    },
  ];

  const [template, setTemplate] = useState({
    id: "",
    reportTypeId: "",
    description: "",
    validFrom: "",
    validTo: "",
    isDefault: false,
  });

  const [columns, setColumns] = useState([
    { title: "Id", data: "id" },
    { title: "Tipo de Reporte", data: "reportTypeName", name: "reportTypeName" },
    { title: "Version", data: "version", name: "version" },
    {
      title: "Vigencia",
      data: null,
      name: "validFrom",
      render: (row) =>
        row?.validFrom
          ? `${row.validFrom}${row.validTo ? " -> " + row.validTo : " (indefinido)"}`
          : "-",
      searchable: false,
    },
    {
      title: "Por defecto",
      data: "isDefault",
      name: "isDefault",
      render: (v) =>
        v
          ? '<span class="badge bg-label-success">Sí</span>'
          : '<span class="badge bg-label-secondary">No</span>',
      searchable: false,
    },
    { title: "Descripcion", data: "description" },
    { title: "Estado", data: "status", name: "status", render: (val) => statusBadge(val) },
    {
      title: "Acciones",
      data: null,
      render: (row) => {
        const id = row.id;
        const hasFile = row.hasFile;
        const downloadBtn = hasFile
          ? `<button class="btn btn-sm btn-label-info action-btn" data-action="download" data-id="${id}" title="Descargar archivo">
               <i class="fas ri-download-2-line"></i>
             </button>`
          : `<button class="btn btn-sm btn-label-secondary" disabled title="Plantilla sin archivo adjunto">
               <i class="fas ri-download-2-line"></i>
             </button>`;
        const deleteBtn = `<button class="btn btn-sm btn-label-danger action-btn" data-action="delete" data-id="${id}" title="Eliminar">
               <i class="fas ri-delete-bin-5-line"></i>
             </button>`;
        return `<div class="d-flex gap-1">${downloadBtn}${deleteBtn}</div>`;
      },
      searchable: false,
    },
  ]);

  /**
   * Carga los tipos de reporte disponibles para el dropdown del modal de creacion.
   */
  const loadReportTypes = async () => {
    try {
      const response = await fetchHelper.post(
        base_url(["api", "report-types"]),
        { length: -1 },
        {},
        500,
        false,
      );
      if (response?.data) {
        setReportTypes(response.data);
      }
    } catch (error) {
      console.error("Error al cargar tipos de reporte", error);
    }
  };

  useEffect(() => {
    loadReportTypes();
  }, []);

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(
        modalCreateRef.current,
      );
    }
    setTemplate({
      id: "",
      reportTypeId: "",
      description: "",
      validFrom: "",
      validTo: "",
      isDefault: false,
    });
    modalCreateInstance.current.show();
  };

  const buttons = [
    {
      text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Plantilla</span>',
      className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
      action: async function (e, dt, button, config) {
        openModalCreate();
      },
    },
  ];

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function () {
      const action = $(this).data("action");
      const id = Number($(this).data("id"));

      switch (action) {
        case "download": {
          const downloadUrl = base_url(["api", "report-templates", id, "download"]);
          const token = localStorage.getItem("token");
          fetch(downloadUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then(async (res) => {
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.msg || "No se pudo descargar el archivo");
              }
              const blob = await res.blob();
              const contentDisposition = res.headers.get("content-disposition") || "";
              const match = contentDisposition.match(/filename="?([^";]+)"?/i);
              const filename = match ? match[1] : `plantilla_${id}`;
              const objectUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = objectUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(objectUrl);
            })
            .catch((err) => {
              window.Swal.fire({
                icon: "error",
                title: "Descarga fallida",
                text: err.message,
              });
            });
          break;
        }
        case "delete":
          window.Swal.fire({
            title: "¿Estas seguro?",
            text: "¿Confirma la eliminacion de la plantilla de reporte?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              const deleteUrl = base_url([
                "api",
                "report-templates",
                "delete",
                id,
              ]);
              try {
                const response = await fetchHelper.delete(
                  deleteUrl,
                  {},
                  {},
                  500,
                  false,
                );
                dataTableRef?.current?.ajax.reload();
                setTemplateDelete(true);
                setTemplateError(false);
              } catch (error) {
                console.error(error);
                setTemplateError(true);
                setTemplateDelete(false);
                dataTableRef?.current?.ajax.reload();
              }
            }
          });
          break;
      }
    };

    table.on("click", ".action-btn", handler);

    return () => {
      table.off("click", ".action-btn", handler);
    };
  }, [data]);

  return (
    <>
      <div className="card">
        <h5 className="card-header text-md-start text-center">
          Plantillas de Reporte
        </h5>
        <AlertPage
          type="success"
          message="Plantilla creada exitosamente."
          show={templateCreate}
          onChange={() => setTemplateCreate(false)}
        />
        <AlertPage
          type="success"
          message="Plantilla de reporte eliminada correctamente"
          show={templateDelete}
          onChange={() => setTemplateDelete(false)}
        />
        <AlertPage
          type="danger"
          message="Error al eliminar la plantilla. Verifique su conexion e intente nuevamente."
          show={templateError}
          onChange={() => setTemplateError(false)}
        />
        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={url}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Plantillas de Reporte"
            setData={setData}
            search={search}
            setSearch={setSearch}
          />
        </div>
      </div>

      <CreateTemplate
        modalRef={modalCreateRef}
        modalInstance={modalCreateInstance}
        template={template}
        setTemplate={setTemplate}
        dataTableRef={dataTableRef}
        setTemplateCreate={setTemplateCreate}
        reportTypes={reportTypes}
      />
    </>
  );
};

export default IndexReportTemplates;
