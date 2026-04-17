import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import DataTableReference from "../../../components/organism/DataTable";

import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";

import CreateAssignment from "./create";
import AlertPage from "../../../components/molecules/AlertPage";

/**
 * Pagina principal de CRUD para Retenciones del Sistema.
 * Muestra un DataTable con las columnas Id, Retencion, Codigo, Vigencia Desde,
 * Vigencia Hasta, Estado y Acciones.
 * Permite asignar y desasignar retenciones al sistema.
 */
const IndexRetenciones = () => {
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
  const [assignmentCreate, setAssignmentCreate] = useState(false);
  const [assignmentDelete, setAssignmentDelete] = useState(false);
  const [assignmentError, setAssignmentError] = useState(false);

  const [withholdings, setWithholdings] = useState([]);

  const url = ["api/v1/resources/system-withholdings"];

  const actions = [
    {
      key: "delete",
      icon: "ri-delete-bin-5-line",
      class: "btn-label-danger",
      title: "Eliminar",
    },
  ];

  const [assignment, setAssignment] = useState({
    id: "",
    withholdingId: "",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const [columns, setColumns] = useState([
    { title: "Id", data: "id" },
    { title: "Retencion", data: "withholdingName", name: "withholdingName" },
    { title: "Codigo", data: "withholdingCode", name: "withholdingCode" },
    { title: "Vigencia Desde", data: "effectiveFrom" },
    { title: "Vigencia Hasta", data: "effectiveTo" },
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

  /**
   * Carga las retenciones disponibles para el dropdown del modal de asignacion.
   */
  const loadWithholdings = async () => {
    try {
      const response = await fetchHelper.post(
        base_url(["api/v1/resources/withholdings"]),
        { length: -1 },
        {},
        500,
        false,
      );
      if (response?.data) {
        setWithholdings(response.data);
      }
    } catch (error) {
      console.error("Error al cargar retenciones", error);
    }
  };

  useEffect(() => {
    loadWithholdings();
  }, []);

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(
        modalCreateRef.current,
      );
    }
    setAssignment({
      id: "",
      withholdingId: "",
      effectiveFrom: "",
      effectiveTo: "",
    });
    modalCreateInstance.current.show();
  };

  const buttons = [
    {
      text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Asignar Retencion</span>',
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
        case "delete":
          window.Swal.fire({
            title: "¿Estas seguro?",
            text: "¿Confirma la desasignacion de la retencion del sistema?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              const deleteUrl = base_url([
                "api/v1/resources/system-withholdings",
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
                setAssignmentDelete(true);
                setAssignmentError(false);
              } catch (error) {
                console.error(error);
                setAssignmentError(true);
                setAssignmentDelete(false);
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
          Retenciones del Sistema
        </h5>
        <AlertPage
          type="success"
          message="Retencion asignada correctamente"
          show={assignmentCreate}
          onChange={() => setAssignmentCreate(false)}
        />
        <AlertPage
          type="success"
          message="Retencion desasignada correctamente"
          show={assignmentDelete}
          onChange={() => setAssignmentDelete(false)}
        />
        <AlertPage
          type="danger"
          message="Error al procesar la retencion. Verifique su conexion e intente nuevamente."
          show={assignmentError}
          onChange={() => setAssignmentError(false)}
        />
        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={url}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Retenciones del Sistema"
            setData={setData}
            search={search}
            setSearch={setSearch}
          />
        </div>
      </div>

      <CreateAssignment
        modalRef={modalCreateRef}
        modalInstance={modalCreateInstance}
        assignment={assignment}
        setAssignment={setAssignment}
        dataTableRef={dataTableRef}
        setAssignmentCreate={setAssignmentCreate}
        withholdings={withholdings}
      />
    </>
  );
};

export default IndexRetenciones;
