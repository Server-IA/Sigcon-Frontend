import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import DataTableReference from "../../../../components/organism/DataTable";

import { fetchHelper } from "../../../../utils/fetch";
import { base_url } from "../../../../utils/functions";

import CreateReportType from "./create";
import UpdatedReportType from "./updated";
import AlertPage from "../../../../components/molecules/AlertPage";

/**
 * Pagina principal de CRUD para Tipos de Reporte.
 * Muestra un DataTable con las columnas Id, Nombre, Descripcion, Estado y Acciones.
 * Permite crear, editar y eliminar tipos de reporte.
 */
const IndexReportTypes = () => {
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);

  const modalUpdateRef = useRef(null);
  const modalUpdateInstance = useRef(null);

  const [search, setSearch] = useState({
    value: "",
    checked: true,
  });

  const [data, setData] = useState([]);
  const [reportTypeCreate, setReportTypeCreate] = useState(false);
  const [reportTypeEdit, setReportTypeEdit] = useState(false);
  const [reportTypeDelete, setReportTypeDelete] = useState(false);
  const [reportTypeError, setReportTypeError] = useState(false);

  const url = ["api", "report-types"];

  const actions = [
    {
      key: "edit",
      icon: "ri-edit-line",
      class: "btn-label-primary",
      title: "Editar",
    },
    {
      key: "delete",
      icon: "ri-delete-bin-5-line",
      class: "btn-label-danger",
      title: "Eliminar",
    },
  ];

  const [reportType, setReportType] = useState({
    id: "",
    name: "",
    description: "",
    status: "",
  });

  const [columns, setColumns] = useState([
    { title: "Id", data: "id" },
    { title: "Nombre", data: "name", name: "name" },
    { title: "Descripcion", data: "description" },
    { title: "Estado", data: "status", name: "status" },
    {
      title: "Acciones",
      data: "id",
      render: (id) => {
        return `
                <div class="d-flex gap-1">
                    ${actions
                      .map(
                        (a) => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}">
                            <i class="fas ${a.icon}"></i>
                        </button>
                    `,
                      )
                      .join("")}
                </div>
            `;
      },
      searchable: false,
    },
  ]);

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(
        modalCreateRef.current,
      );
    }
    setReportType({
      id: "",
      name: "",
      description: "",
      status: "ACTIVE",
    });
    modalCreateInstance.current.show();
  };

  const buttons = [
    {
      text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Tipo de Reporte</span>',
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
        case "edit":
          const ref = data.find((m) => m.id === id);

          if (!ref) {
            console.warn("Tipo de reporte no encontrado", id);
            return;
          }

          setReportType({
            id: ref.id,
            name: ref.name == null ? "" : ref.name,
            description: ref.description == null ? "" : ref.description,
            status: ref.status == null ? "" : ref.status,
          });

          if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(
              modalUpdateRef.current,
            );
          }
          modalUpdateInstance.current.show();
          break;
        case "delete":
          window.Swal.fire({
            title: "¿Estas seguro?",
            text: "¿Confirma la eliminacion del tipo de reporte?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              const deleteUrl = base_url(["api", "report-types", "delete", id]);
              try {
                const response = await fetchHelper.delete(
                  deleteUrl,
                  {},
                  {},
                  500,
                  false,
                );
                dataTableRef?.current?.ajax.reload();
                setReportTypeDelete(true);
                setReportTypeError(false);
              } catch (error) {
                console.error(error);
                setReportTypeError(true);
                setReportTypeDelete(false);
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
        <h5 className="card-header text-md-start text-center">Tipos de Reporte</h5>
        <AlertPage
          type="success"
          message="Tipo de reporte creado correctamente"
          show={reportTypeCreate}
          onChange={() => setReportTypeCreate(false)}
        />
        <AlertPage
          type="success"
          message="Tipo de reporte actualizado correctamente"
          show={reportTypeEdit}
          onChange={() => setReportTypeEdit(false)}
        />
        <AlertPage
          type="success"
          message="Tipo de reporte eliminado correctamente"
          show={reportTypeDelete}
          onChange={() => setReportTypeDelete(false)}
        />
        <AlertPage
          type="danger"
          message="Error al eliminar el tipo de reporte. Verifique su conexion e intente nuevamente."
          show={reportTypeError}
          onChange={() => setReportTypeError(false)}
        />
        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={url}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Tipos de Reporte"
            setData={setData}
            search={search}
            setSearch={setSearch}
          />
        </div>
      </div>

      <CreateReportType
        modalRef={modalCreateRef}
        modalInstance={modalCreateInstance}
        reportType={reportType}
        setReportType={setReportType}
        dataTableRef={dataTableRef}
        setReportTypeCreate={setReportTypeCreate}
      />

      <UpdatedReportType
        modalRef={modalUpdateRef}
        modalInstance={modalUpdateInstance}
        reportType={reportType}
        setReportType={setReportType}
        dataTableRef={dataTableRef}
        setReportTypeEdit={setReportTypeEdit}
      />
    </>
  );
};

export default IndexReportTypes;
