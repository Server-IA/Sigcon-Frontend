//menus/filter.jsx
import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

//componentes
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";
import DropzoneModal from "../../../components/molecules/DropzoneModal";

//VISTAS
import CreateAssets from "./create";
import UpdateAssets from "./update";
import FilterAssets from "./filter";

//FUNCIONES
import { base_url, formatPrice } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { COMPONENT_MAP } from "../../../utils/map_menu";

const IndexAssets = () => {
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const filterRef = useRef(null);
  const filterInstance = useRef(null);
  const modalBulkUploadRef = useRef(null);
  const modalBulkUploadInstance = useRef(null);

  const [thirds, setThirds] = useState([]);
  const [accountingAccount, setAccountingAccount] = useState([]);
  const [depreciationRules, setDepreciationRules] = useState([]);
  const [assetsBulk, setAssetsBulk] = useState(false);

  // const [costCenters, setCostCenters] = useState([]);

  const user = useSelector((state) => state.user).user;
  const [assetsCreate, setAssetsCreate] = useState(false);
  const [assetsUpdate, setAssetsUpdate] = useState(false);

  const [search, setSearch] = useState({
    value: "",
    checked: true,
  });

  const loadData = async () => {
    try {
      const [
        depreciationRulerRes,
        accountingAccountRes,
        thirdsRes,
        costCenterRes,
      ] = await Promise.allSettled([
        fetchHelper.post(
          base_url(["api", "v1", "depreciation-rules", "search"]),
          { length: -1 },
          {},
          1,
        ),

        fetchHelper.post(
          base_url(["api", "v1", "accounting-accounts"]),
          { length: -1 },
          {},
          1,
        ),

        fetchHelper.post(
          base_url(["api", "v1", "third-parties", "search"]),
          {
            length: -1,
            columns: [{ data: "roles.id", search: { value: 2, regex: false } }],
          },
          {},
          1,
        ),
        // fetchHelper.post(
        //   base_url(["api", "v1", "cost-centers", "search"]),
        //   {
        //     length: -1,
        //   },
        //   {},
        //   1,
        // ),
      ]);

      if (depreciationRulerRes.status === "fulfilled")
        setDepreciationRules(
          depreciationRulerRes.value.data.map((d) => ({
            id: d.id,
            label: d.name,
            accountingAccountId: d.accountingAccountId,
          })) || [],
        );

      if (accountingAccountRes.status === "fulfilled")
        setAccountingAccount(
          accountingAccountRes.value.data.map((d) => ({
            id: d.id,
            label: d.customName,
          })) || [],
        );

      if (thirdsRes.status === "fulfilled")
        setThirds(
          thirdsRes.value.data.map((d) => ({
            id: d.id,
            label: `${d.thirdPartyCode} - ${d.businessName}`,
          })) || [],
        );

      // if (costCenterRes.status === "fulfilled")
      //   setCostCenters(
      //     costCenterRes.value.data.map((d) => ({
      //       id: d.id,
      //       label: `${d.companyId} - ${d.name}`,
      //     })) || [],
      //   );

      const failed = [
        depreciationRulerRes,
        accountingAccountRes,
        thirdsRes,
        // costCenterRes,
      ].filter((r) => r.status === "rejected");

      if (failed.length)
        console.warn(
          "Algunos datos no pudieron cargarse:",
          failed.map((f) => f.reason),
        );
    } catch (error) {
      console.error("Error general cargando datos:", error);
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
    accountingAccountId: "",
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

  const openModalBulkUpload = () => {
    if (!modalBulkUploadInstance.current) {
      modalBulkUploadInstance.current = new window.bootstrap.Modal(
        modalBulkUploadRef.current,
      );
    }
    modalBulkUploadInstance.current.show();
  };
  const buttons = [
    {
      text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2 ",
      action: function () {
        openFilter();
      },
    },
    {
      text: '<i class="ri-upload-cloud-2-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Carga Masiva</span>',
      className: "btn rounded-pill btn-outline-primary waves-effect mx-2 my-2",
      action: openModalBulkUpload,
    },

    user.permissions.find((p) => p.code === "CREATE_ASSETS") || isAdmin
      ? {
          text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Activo</span>',
          className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
          action: function () {
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
      key: "kardex",
      icon: "ri-arrow-left-right-line",
      class: "btn-label-primary",
      title: "Kardex",
    },
    {
      key: "delete",
      icon: "ri-delete-bin-5-line",
      class: "btn-label-danger",
      title: "Eliminar",
    },
    {
      key: "view",
      icon: "ri-eye-line",
      class: "btn-label-info",
      title: "Ver",
    },
  ];

  const columns = [
    { title: "Código", data: "assetCode", name: "assetCode" },
    { title: "Nombre", data: "name", name: "name" },
    {
      title: "Clasificación",
      data: "classification",
      name: "classification",
      render: (v) => {
        const map = {
          NON_CURRENT: "Activo no corriente",
          CURRENT: "Activo corriente",
        };
        return map[v] || v;
      },
    },
    {
      title: "Fecha adquisición",
      data: "acquisitionDate",
      name: "acquisition_date",
    },
    {
      title: "Costo adquisición",
      data: "acquisitionValue",
      name: "acquisition_cost",
      render: (v) => formatPrice(v),
    },
    {
      title: "Vida útil (meses)",
      data: "usefulLifeMonths",
      name: "usefulLifeMonths",
    },
    {
      title: "Depreciable",
      data: "is_depreciable",
      render: (v) => (v ? "Sí" : "No"),
    },
    {
      title: "Estado",
      data: "status",
      name: "status",
      render: (v) => v ?? "-",
    },
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

    //  RESET DEL FORM
    setAssets({
      name: "",
      description: "",
      classification: "",
      type: "",
      accountingAccountId: "",
      acquisitionValue: "",
      acquisitionDate: "",
      usefulLifeMonths: "",
      depreciationRuleId: "",
      supplierId: "",
      paymentTerms: "",
      accountsPayableReferenceId: "",
      bankCashReferenceId: "",
      costCenterOrAccountingLocation: "",
      status: "",
      observations: "",
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

  const getKardexUrl = (assetCode = "") => {
    const basePath =
      import.meta.env.VITE_ENVIRONMENT == "local"
        ? ""
        : import.meta.env.VITE_ENVIRONMENT == "development"
          ? "/sigcon/dev"
          : "/sigcon";

    const query = assetCode ? `?asset=${encodeURIComponent(assetCode)}` : "";

    return `${basePath}/activos/kardex${query}`;
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

          console.log("Activo seleccionado:", assetsRef);
          setAssets({
            id: assetsRef.id,
            name: assetsRef.name || "",
            description: assetsRef.description || "",
            classification: assetsRef.classification || "",
            type: assetsRef.type || "",

            accountingAccountId: assetsRef.accountingAccount?.id || "",

            acquisitionValue: assetsRef.acquisitionValue || "",
            acquisitionDate: assetsRef.acquisitionDate || "",
            usefulLifeMonths: assetsRef.usefulLifeMonths || "",

            depreciationRuleId: assetsRef.depretationRule?.id || "",

            supplierId: assetsRef.supplier?.id || "",

            paymentTerms: assetsRef.paymentTerms || "",
            accountsPayableReferenceId:
              assetsRef.accountsPayableReferenceId || "",

            bankCashReferenceId: assetsRef.bankCashReferenceId || "",

            costCenterOrAccountingLocation:
              assetsRef.costCenterOrAccountingLocation || "",

            status: assetsRef.status || "",
            observations: assetsRef.observations || "",
          });

          openModalUpdate();
          break;

        case "kardex":
          const assetKardex = data.find((m) => m.id === id);

          if (!assetKardex) {
            console.warn("Activo no encontrado", id);
            return;
          }

          window.open(getKardexUrl(assetKardex.assetCode || ""), "_blank");
          break;

        case "delete":
          console.log("Eliminar", id);
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
            data={data}
          />
        </div>

        <CreateAssets
          modalRef={modalCreateRef}
          modalInstance={modalCreateInstance}
          assets={assets}
          setAssets={setAssets}
          dataTableRef={dataTableRef}
          setAssetsCreate={setAssetsCreate}
          thirds={thirds}
          accountingAccount={accountingAccount}
          depreciationRules={depreciationRules}
          // costCenters={costCenters}
        />

        <UpdateAssets
          modalRef={modalUpdateRef}
          modalInstance={modalUpdateInstance}
          assets={assets}
          setAssets={setAssets}
          dataTableRef={dataTableRef}
          setAssetsUpdate={setAssetsUpdate}
          thirds={thirds}
          accountingAccount={accountingAccount}
          depreciationRules={depreciationRules}
        />
        <FilterAssets
          filterRef={filterRef}
          filterInstance={filterInstance}
          dataTableRef={dataTableRef}
          thirds={thirds}
          accountingAccount={accountingAccount}
          depreciationRules={depreciationRules}
        />
        <DropzoneModal
          modalRef={modalBulkUploadRef}
          title="Carga Masiva de Activos"
          uploadUrl={base_url(["api", "v1", "assets", "bulk", "store"])}
          onSuccess={() => {
            setAssetsBulk(true);
            dataTableRef?.current?.ajax?.reload?.();
          }}
        />
      </div>
    </>
  );
};

export default IndexAssets;
