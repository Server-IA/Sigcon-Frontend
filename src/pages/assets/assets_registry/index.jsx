//menus/filter.jsx
import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

//componentes
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";

//VISTAS
import CreateAssets from "./create";
import UpdateAssets from "./update";
import FilterAssets from "./filter";

//FUNCIONES
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { COMPONENT_MAP } from "../../../utils/map_menu";

const IndexAssets = () => {
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const filterRef = useRef(null);
  const filterInstance = useRef(null);
  const [thirds, setThirds] = useState([]);
  const [puc, setPuc] = useState([]);
  const user = useSelector((state) => state.user).user;
  const [assetsCreate, setAssetsCreate] = useState(false);
  const [assetsUpdate, setAssetsUpdate] = useState(false);

  const [search, setSearch] = useState({
    value: "",
    checked: true,
  });

  const loadData = async () => {
    try {
      const [thirdsRes] = await Promise.all([
        fetchHelper.post(
          base_url(["api", "v1", "third-parties", "search"]),
          {
            length: -1,
          },
          {},
          1,
        ),
      ]);
      const thirdsOptions = thirdsRes.data.map((item) => ({
        id: item.id,
        label: `${item.thirdPartyCode} - ${item.nit}`,
      }));
      setThirds(thirdsOptions);

      const [pucRes] = await Promise.all([
        fetchHelper.post(
          base_url(["api", "v1", "chart-of-accounts", "search"]),
          {
            length: -1,
          },
          {},
          1,
        ),
      ]);
      const pucOptions = (pucRes.data || []).map((item) => ({
        id: item.code,
        label: `${item.code} - ${item.name}`,
      }));

      setPuc(pucOptions);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [assets, setAssets] = useState({
    name: "",
    description: "",
    classification: "",
    type: "",
    accountingCode: "",
    acquisitionValue: "",
    acquisitionDate: "",
    usefulLifeMonths: "",
    depreciationMethod: "",
    supplierId: "",
    paymentTerms: "",
    accountsPayableReferenceId: "",
    bankCashReferenceId: "",
    costCenterOrAccountingLocation: "",
    status: "",
    observations: "",
  });

  const [messageAssets, setMessageAssets] = useState({
    message: "",
    type: "",
    show: false,
  });

  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);
  const modalUpdateRef = useRef(null);
  const modalUpdateInstance = useRef(null);

  const [url, setUrl] = useState(base_url(["api", "v1", "assets", "search"]));
  const buttons = [
    {
      text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2 ",
      action: async function (e, dt, button, config) {
        // if (!filterInstance.current) {
        //   filterInstance.current = new window.bootstrap.Modal(
        //     filterRef.current,
        //   );
        // }
        // filterInstance.current.show();
      },
    },

    user.permissions.find((p) => p.code === "CREATE_ASSETS") || isAdmin
      ? {
          text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Activo</span>',
          className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
          action: async function (e, dt, button, config) {
            openModalCreate();
          },
        }
      : null,
  ].filter((button) => button !== null);

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
  const columns = [
    { title: "Código", data: "code", name: "code" },
    // { title: "Nombre", data: "name", name: "name" },
    // { title: "Clasificación", data: "classification", name: "classification" },
    // {
    //   title: "Fecha adquisición",
    //   data: "acquisition_date",
    //   name: "acquisition_date",
    // },
    // {
    //   title: "Costo adquisición",
    //   data: "acquisition_cost",
    //   name: "acquisition_cost",
    // },
    // {
    //   title: "Vida útil (meses)",
    //   data: "useful_life_months",
    //   name: "useful_life_months",
    // },
    // {
    //   title: "Depreciable",
    //   data: "is_depreciable",
    //   render: (v) => (v ? "Sí" : "No"),
    // },
    // {
    //   title: "Estado",
    //   data: "statesAsset.name",
    //   name: "statesAsset",
    //   render: (v) => v ?? "-",
    // },
    {
      title: "Acciones",
      data: "id",
      searchable: false,
      render: (id) => `
         <div class="d-flex gap-1">
          ${actions
            .map(
              (a) => `
             <button class="btn btn-sm ${a.class} action-btn"
               data-action="${a.key}" data-id="${id}">
               <i class="${a.icon}"></i>
             </button>`,
            )
            .join("")}
         </div>`,
    },
  ];

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(
        modalCreateRef.current,
      );
    }
    setAssets({
      id: "",
      code: "",
      name: "",
      description: "",
      classification: "",
      acquisition_date: "",
      acquisition_cost: "",
      useful_life_months: "",
      accumulated_depreciation: "",
      book_value: "",
      revaluation_value: "",
      is_depreciable: true,
      depreciation_rule_id: null,
      companies_id: null,
      accounting_accounts_id: null,
      company_locations_id: null,
      third_parties_id: null,
      states_assets_id: null,
    });
    modalCreateInstance.current.show();
  };
  const openModalUpdate = () => {
    if (!modalUpdateInstance.current) {
      modalUpdateInstance.current = new window.bootstrap.Modal(
        modalUpdateRef.current,
      );
    }
    modalUpdateInstance.current.show();
  };

  const openFilter = () => {
    if (!filterInstance.current) {
      filterInstance.current = new window.bootstrap.Modal(filterRef.current);
    }
    filterInstance.current.show();
  };

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function () {
      const action = $(this).data("action");
      const id = Number($(this).data("id"));

      switch (action) {
        case "edit":
          const assetsRef = data.find((m) => m.id === id);

          if (!assetsRef) {
            console.warn("Activo no encontrado", id);
            return;
          }

          setAssets({
            id: assetsRef.id || "",
            label: assetsRef.label || "",
            icon: assetsRef.icon || "",
            path: assetsRef.path || "",
            menuOrder: assetsRef.menuOrder || "",
            parentId: assetsRef.parent ? String(assetsRef.parent.id) : null,
            moduleId: assetsRef.module ? String(assetsRef.module.id) : null,
            status: assetsRef.status || "",
            component: assetsRef.component || "",
          });

          setClickEdit(true);
          break;
        case "delete":
          window.Swal.fire({
            title: "¿Estás seguro?",
            text: "¿Estás seguro de querer eliminar este activo?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              const url = base_url(["api", "assets", id]);
              try {
                await fetchHelper.delete(url, {}, {}, 500, false);
                dataTableRef?.current?.ajax.reload();
                dispatch(refreshAssets());
                setAssetsDelete(true);
                setAssetsError(false);
              } catch (error) {
                console.error(error);
                setAssetsError(true);
                setAssetsDelete(false);
                dataTableRef?.current?.ajax.reload();
              }
            }
          });
          break;
        default:
          console.warn("Acción no válida", action);
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
          Lista de Activos
        </h5>

        <AlertPage
          type={messageAssets.type}
          message={messageAssets.message}
          show={messageAssets.show}
          onChange={() => setMessageAssets({ ...messageAssets, show: false })}
        />

        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={["api", "v1", "assets", "search"]}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Activos"
            setData={setData}
            search={search}
            setSearch={setSearch}
            filtered={true}
          />
        </div>

        {/* <FilterAssets
          filterRef={filterRef}
          filterInstance={filterInstance}
          dataTableRef={dataTableRef}
          parents={parents}
          components={COMPONENT_MAP.map((component) => ({
            id: component.id,
            name: component.name,
          }))}
        /> */}

        <CreateAssets
          modalRef={modalCreateRef}
          modalInstance={modalCreateInstance}
          assets={assets}
          setAssets={setAssets}
          dataTableRef={dataTableRef}
          setAssetsCreate={setAssetsCreate}
          thirds={thirds}
          puc={puc}
        />

        {/* <UpdateAssets
          modalRef={modalUpdateRef}
          modalInstance={modalUpdateInstance}
          assets={assets}
          setAssets={setAssets}
          dataTableRef={dataTableRef}
          setAssetsUpdate={setAssetsUpdate}
          parents={parents}
          components={components}
        /> */}
      </div>
    </>
  );
};

export default IndexAssets;
