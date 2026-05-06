//menus/filter.jsx
import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

//componentes
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";
import DropzoneModal from "../../../components/molecules/DropzoneModal";

//VISTAS
import CreateAssets from "./create";
import UpdateAssets from "./update";
import FilterAssets from "./filter";

//FUNCIONES
import { base_url, formatPrice, separateNumber } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { COMPONENT_MAP } from "../../../utils/map_menu";

const IndexAssets = () => {

  const navigate = useNavigate();

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

  const [invoicesFC, setInvoicesFC] = useState([]);
  const [assetsSystem, setAssetsSystem] = useState([]);

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
        // costCenterRes,
        invoicesFCRes,
        assetsSystemRes,
      ] = await Promise.allSettled([
        fetchHelper.post(
          base_url(["api", "v1", "depreciation-rules", "search"]),
          { length: -1 },
          {},
          1,
        ),

        fetchHelper.post(
          base_url(["api", "v1", "accounting-accounts"]),
          { length: -1,
            columns:[
              {
                data:"pucAccount.code",
                searchable: true,
                search:{
                  value:"14%,12%,15%,16%",
                  regex:true
                }
              }
            ]
          },
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

        fetchHelper.post(
          base_url(["api", "v1", "invoices", "search"]),
          {
            length: -1,
            columns: [{ data: "typeInvoice.id", search: { value: 1, regex: false } }],
          },
          {},
          1,
        ),

        fetchHelper.post(
          base_url(["api", "v1", "assets", "search"]  ),
          {
            length: -1,
          },
          {},
          1,
        ),
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

      if (invoicesFCRes.status === "fulfilled")
        setInvoicesFC(Array.isArray(invoicesFCRes.value?.data) ? invoicesFCRes.value.data : []);

      if (assetsSystemRes.status === "fulfilled")
        setAssetsSystem(Array.isArray(assetsSystemRes.value?.data) ? assetsSystemRes.value.data : []);

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
  // HU-ACT-10 E4: detalle (solo lectura)
  const modalDetailRef = useRef(null);
  const modalDetailInstance = useRef(null);
  const [detailAsset, setDetailAsset] = useState(null);
  const openDetailModal = (asset) => {
    setDetailAsset(asset);
    if (!modalDetailInstance.current) {
      modalDetailInstance.current = new window.bootstrap.Modal(modalDetailRef.current);
    }
    modalDetailInstance.current.show();
  };

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
      text: '<i className="ri-filter-line ri-16px me-sm-2"></i> <span className="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2 ",
      action: function () {
        openFilter();
      },
    },
    {
      text: '<i className="ri-upload-cloud-2-line ri-16px me-sm-2"></i> <span className="d-none d-sm-inline-block">Carga Masiva</span>',
      className: "btn rounded-pill btn-outline-primary waves-effect mx-2 my-2",
      action: openModalBulkUpload,
    },

    ((user?.permissions || []).find((p) => p.code === "CREATE_ASSETS") || isAdmin)
      ? {
          text: '<i className="ri-add-line ri-16px me-sm-2"></i> <span className="d-none d-sm-inline-block">Crear Activo</span>',
          className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
          action: function () {
            navigate("create");
            // openModalCreate();
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
      // QA-BLOQUE-AR (2026-04-30): renombrado para reflejar la accion real
      title: "Bajas / Transferencias",
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
    { title: "Comprobante", data: "vouchers", name: "vouchers", render: (v) => {
      const comprobado = v.length > 0;
      return comprobado ? `<span class="badge bg-success">Sí</span>` : `<span class="badge bg-danger">No</span>`;
    }, searchable: false },
    { title: "Código", data: "assetCode", name: "assetCode" },
    // QA-BLOQUE-AY (2026-05-05): la entidad Assets usa `assetName` (no `name`).
    // El name del DataTable debe apuntar al path JPA real para que el filtro
    // y ordenamiento funcionen via DataTableSpecificationBuilder. data='name'
    // sigue mapeando el campo del DTO de respuesta.
    { title: "Nombre", data: "name", name: "assetName" },
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
    // QA-BLOQUE-AY (2026-05-05): columna `type` invisible para que el filter
    // "Tipo" del modal aplique sobre la columna real. Antes el sufijo
    // `type:name` no encajaba con ninguna columna del DataTable y el filtro
    // se ignoraba silenciosamente.
    {
      title: "Tipo",
      data: "type",
      // Entidad usa `assetType`, DTO usa `type`.
      name: "assetType",
      visible: false,
      searchable: true,
    },
    {
      title: "Fecha adquisición",
      data: "acquisitionDate",
      name: "acquisitionDate",
    },
    {
      title: "Costo adquisición",
      data: "acquisitionValue",
      name: "acquisitionValue",
      // HU-ACT-10 E3: ordenable por costo (mayor a menor / menor a mayor).
      orderable: true,
      render: (v,_,row) => formatPrice((row.acquisitionValue || 0) + (row.taxValue || 0)),
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
      title: "Proveedor",
      data: "supplier",
      // HU-ACT-10 E2: la columna debe poder filtrarse por id de proveedor
      // (el filtro multi-select envia ids separados por '|'). El backend
      // resuelve `supplier.id` via Specification.
      name: "supplier.id",
      searchable: true,
      orderable: false,
      render: (v) => v?.businessName || "-",
      defaultContent: "-",
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
      // HU-ACT-10: el boton eliminar se ocultaba para activos con voucher
      // (i.e. todos los recien creados). Ahora se muestra siempre salvo que
      // el activo este DECOMMISSIONED o TRANSFERRED (estados terminales).
      render: (id, _, asset) => `
         <div className="d-flex gap-1">
          ${actions
            .filter((a) => a.key !== "delete" || (asset.status !== "DECOMMISSIONED" && asset.status !== "TRANSFERRED"))
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

          navigate(`edit/${assetsRef.id}`);
          return;

          // console.log("Activo seleccionado:", assetsRef);
          // setAssets({
          //   id: assetsRef.id,
          //   name: assetsRef.name || "",
          //   description: assetsRef.description || "",
          //   classification: assetsRef.classification || "",
          //   type: assetsRef.type || "",

          //   accountingAccountId: assetsRef.accountingAccount?.id || "",

          //   acquisitionValue: assetsRef.acquisitionValue || "",
          //   acquisitionDate: assetsRef.acquisitionDate || "",
          //   usefulLifeMonths: assetsRef.usefulLifeMonths || "",

          //   depreciationRuleId: assetsRef.depretationRule?.id || "",

          //   supplierId: assetsRef.supplier?.id || "",

          //   paymentTerms: assetsRef.paymentTerms || "",
          //   accountsPayableReferenceId:
          //     assetsRef.accountsPayableReferenceId || "",

          //   bankCashReferenceId: assetsRef.bankCashReferenceId || "",

          //   costCenterOrAccountingLocation:
          //     assetsRef.costCenterOrAccountingLocation || "",

          //   status: assetsRef.status || "",
          //   observations: assetsRef.observations || "",
          // });

          openModalUpdate();
          break;

        case "kardex":
          // QA-BLOQUE-AR (2026-04-30): el boton (icono flechas dobles) ahora
          // navega a Bajas y Transferencias con el activo preseleccionado.
          // Antes hacia window.open a /activos/kardex (modulo en español que
          // NO existe en routing) -> 404. La intencion del contador es
          // operar bajas/transferencias del activo, no kardex propiamente.
          const assetKardex = data.find((m) => m.id === id);

          if (!assetKardex) {
            console.warn("Activo no encontrado", id);
            return;
          }

          navigate(`/assets/bajas-transferencias?asset=${encodeURIComponent(assetKardex.assetCode || "")}`);
          break;

        case "view": {
          // HU-ACT-10 E4: vista de detalle de SOLO LECTURA (no editable).
          const assetView = data.find((m) => m.id === id);
          if (!assetView) { console.warn("Activo no encontrado", id); return; }
          openDetailModal(assetView);
          break;
        }

        case "delete":
          window.Swal.fire({
            title: '¿Eliminar activo?',
            text: 'Esta acción eliminará el activo del sistema.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await fetchHelper.delete(base_url(['api', 'v1', 'assets', id]), {}, {}, 500, false);
                dataTableRef?.current?.ajax.reload();
                setMessageAssets({ message: 'Activo eliminado exitosamente', type: 'success', show: true });
              } catch (error) {
                setMessageAssets({ message: error?.msg || 'Error al eliminar el activo', type: 'danger', show: true });
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
        <div className="card-widget-separator-wrapper">
          <div className="card-body card-widget-separator">
            <div className="row gy-4 gy-sm-1">
              <div className="col-sm-12 col-lg-6">
                <div className="d-flex justify-content-between align-items-start card-widget-1 border-end pb-4 pb-sm-0">
                  <div>
                    <p className="mb-1">Activos comprobados</p>
                    <h4 className="mb-1">{
                      (() => {
                        const total = (assetsSystem || []).reduce((acc, asset) => {
                          const voucher = (asset?.vouchers || []).reduce((acc2, voucher) => acc2 + parseFloat(voucher?.amount ?? 0), 0);
                          return acc + (voucher ?? 0);
                        }, 0);
                        return formatPrice(total);

                      })()
                    }</h4>
                    <p className="mb-0">
                      <span className="me-2">Total: {separateNumber((assetsSystem || []).filter((asset) => (asset?.vouchers || []).length > 0).length)}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-sm-12 col-lg-6">
                <div className="d-flex justify-content-between align-items-start card-widget-2 border-end pb-4 pb-sm-0">
                  <div>
                    <p className="mb-1">Activos sin comprobantes</p>
                    <h4 className="mb-1">{
                      (() => {
                        const total = (assetsSystem || []).filter((asset) => (asset?.vouchers || []).length === 0).reduce((acc, asset) => {
                          return acc + parseFloat((Number(asset?.acquisitionValue) || 0) + (Number(asset?.taxValue) || 0));
                        }, 0);
                        return formatPrice(total);
                      })()}
                      </h4>
                    <p className="mb-0">
                      <span className="me-2">Total: {separateNumber((assetsSystem || []).filter((asset) => (asset?.vouchers || []).length === 0).length)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

        {/* <CreateAssets
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
        /> */}

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
          suppliers={thirds}
          accountingAccount={accountingAccount}
          depreciationRules={depreciationRules}
          statuses={[
            { id: 'ACTIVE', name: 'Activo' },
            { id: 'IN_REPAIR', name: 'En reparación' },
            { id: 'DECOMMISSIONED', name: 'Dado de baja' },
            { id: 'TRANSFERRED', name: 'Transferido' },
          ]}
        />

        {/* HU-ACT-10 E4: modal de detalle (solo lectura) */}
        <div className="modal fade" ref={modalDetailRef} tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="ri-eye-line me-2"></i>Detalle del activo
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                {detailAsset && (
                  <div className="row g-3">
                    <div className="col-md-6"><strong>Codigo:</strong> {detailAsset.assetCode || '-'}</div>
                    <div className="col-md-6"><strong>Nombre:</strong> {detailAsset.name || '-'}</div>
                    <div className="col-md-6"><strong>Clasificacion:</strong> {
                      ({NON_CURRENT:'Activo no corriente', CURRENT:'Activo corriente'})[detailAsset.classification] || detailAsset.classification || '-'
                    }</div>
                    <div className="col-md-6"><strong>Tipo:</strong> {
                      ({TANGIBLE:'Tangible', INTANGIBLE:'Intangible'})[detailAsset.type] || detailAsset.type || '-'
                    }</div>
                    <div className="col-md-6"><strong>Estado:</strong> {detailAsset.status || '-'}</div>
                    <div className="col-md-6"><strong>Fecha adquisicion:</strong> {detailAsset.acquisitionDate || '-'}</div>
                    <div className="col-md-6"><strong>Valor adquisicion:</strong> {formatPrice(detailAsset.acquisitionValue || 0)}</div>
                    <div className="col-md-6"><strong>Vida util (meses):</strong> {detailAsset.usefulLifeMonths || '-'}</div>
                    <div className="col-md-6"><strong>Cuenta contable:</strong> {detailAsset.accountingAccount?.customName || detailAsset.accountingAccount?.pucAccount?.name || '-'}</div>
                    <div className="col-md-6"><strong>Regla depreciacion:</strong> {detailAsset.depretationRule?.name || '-'}</div>
                    <div className="col-md-12"><strong>Proveedor:</strong> {detailAsset.supplier?.businessName || '-'} {detailAsset.supplier?.nit ? `(NIT ${detailAsset.supplier.nit})` : ''}</div>
                    <div className="col-md-12"><strong>Descripcion:</strong> {detailAsset.description || '-'}</div>
                    <div className="col-md-12"><strong>Observaciones:</strong> {detailAsset.observations || '-'}</div>
                    <div className="col-md-12">
                      <strong>Comprobantes:</strong> {detailAsset.vouchers?.length > 0
                        ? `${detailAsset.vouchers.length} registrado(s)`
                        : 'Sin comprobante'}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
        <DropzoneModal
          modalRef={modalBulkUploadRef}
          title="Carga Masiva de Activos"
          uploadUrl={base_url(["api", "v1", "assets", "bulk", "store"])}
          onSuccess={() => {
            setAssetsBulk(true);
            dataTableRef?.current?.ajax?.reload?.();
          }}
          templateColumns={['nombre','descripcion','clasificacion','tipo','cuenta_contable_id','proveedor_id','valor_adquisicion','fecha_adquisicion','vida_util_meses','regla_depreciacion_id','estado','observaciones']}
          templateFileName="plantilla_activos.csv"
        />
      </div>
    </>
  );
};

export default IndexAssets;
