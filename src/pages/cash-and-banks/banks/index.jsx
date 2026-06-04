
const INITIAL_BANK = {
  ID_BANCO: null,
  CODIGO_BANCO: "",
  NOMBRE_BANCO: "",
  NOMBRE_CORTO: "",
  TIPO_BANCO: "",
  NIT_BANCO: "",
  PAIS_ID: null,
  CODIGO_SWIFT: "",
  CODIGO_ACH: "",
  CIUDAD_PRINCIPAL: "",
  DIRECCION_PRINCIPAL: "",
  TELEFONO_PRINCIPAL: "",
  FORMATO_EXTRACTO: "",
  URL_WEBSERVICE: "",
  DIAS_CONCILIACION: "",
  ESTADO: "ACTIVE",
  MOTIVO_CAMBIO: "",
  MOTIVO_ELIMINACION: "",
  HAS_ASSOCIATED_ACCOUNTS: false,
  HAS_ACTIVE_ASSOCIATED_ACCOUNTS: false,
};
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import {
  highlightMatch,
  formatBankStatus,
  sanitizeSimpleText,
} from "../../../utils/bankUtils";
import { validateText } from "../../../utils/fieldValidations";

import CreateCashAndBanks from "./create";
import UpdatedCashAndBanks from "./updated";
import FilterCashAndBanks from "./filter";

import { useNavigate } from "react-router-dom";

const API_SEARCH = ["api", "v1", "banks", "search"];
const API_BASE = ["api", "v1", "banks"];
const API_STORE = ["api", "v1", "banks", "store"];

const countryEndpointCandidates = [["api", "v1", "resources", "countries"]];

const TYPE_BANK_LABELS = {
  COMMERCIAL: "Comercial",
  COOPERATIVE: "Cooperativo",
  PUBLIC: "Publico",
  FOREIGN: "Extranjero",
};

const TYPE_BANK_UI_MAP = {
  NONE: "Ninguno",
  COMMERCIAL: "COMERCIAL",
  COOPERATIVE: "COOPERATIVO",
  PUBLIC: "PUBLICO",
  FOREIGN: "EXTRANJERO",
};

const formatCountryOptions = (rows = []) =>
  rows
    .filter((row) => {
      const status = row.status || row.ESTADO || row.state;
      return !status || String(status).toUpperCase() === "ACTIVE";
    })
    .map((row) => {
      const code = (row.code || row.iso3 || row.PAIS_CODIGO || "").toUpperCase();
      const label = row.name || row.nombre || row.countryName || code;
      return {
        id: row.id ?? row.ID ?? row.countryId ?? null,
        code,
        label: `${code} - ${label}`,
      };
    })
    .filter((row) => row.id !== null && row.id !== undefined);

const normalizeBankFromRow = (row = {}) => ({
  ID_BANCO: row.id ?? row.ID_BANCO ?? null,
  CODIGO_BANCO: row.code ?? row.CODIGO_BANCO ?? "",
  NOMBRE_BANCO: row.name ?? row.NOMBRE_BANCO ?? "",
  NOMBRE_CORTO: row.nameShort ?? row.NOMBRE_CORTO ?? "",
  TIPO_BANCO: row.typeBank || row.TIPO_BANCO || "",
  NIT_BANCO: row.nit ?? row.NIT_BANCO ?? "",
  PAIS_ID: row.country?.id ?? row.countryId ?? row.PAIS_ID ?? null,
  CODIGO_SWIFT: row.swift ?? row.CODIGO_SWIFT ?? "",
  CODIGO_ACH: row.codeAch ?? row.CODIGO_ACH ?? "",
  CIUDAD_PRINCIPAL: row.city ?? row.CIUDAD_PRINCIPAL ?? "",
  DIRECCION_PRINCIPAL: row.address ?? row.DIRECCION_PRINCIPAL ?? "",
  TELEFONO_PRINCIPAL: row.phone ?? row.TELEFONO_PRINCIPAL ?? "",
  FORMATO_EXTRACTO: row.formatExtract ?? row.FORMATO_EXTRACTO ?? "",
  URL_WEBSERVICE: row.urlWebservice ?? row.URL_WEBSERVICE ?? "",
  DIAS_CONCILIACION: row.conciliationDays ?? row.DIAS_CONCILIACION ?? "",
  ESTADO: row.status ?? row.ESTADO ?? "ACTIVE",
  MOTIVO_CAMBIO: "",
  MOTIVO_ELIMINACION: "",
  HAS_ASSOCIATED_ACCOUNTS:
    row.hasAssociatedAccounts ?? row.HAS_ASSOCIATED_ACCOUNTS ?? false,
  HAS_ACTIVE_ASSOCIATED_ACCOUNTS:
    row.hasActiveAssociatedAccounts ?? row.HAS_ACTIVE_ASSOCIATED_ACCOUNTS ?? false,
});

const IndexCashAndBanks = () => {
  const userPermissions =
    useSelector((state) => state.user.user)?.permissions?.filter(
      (p) => p.code.includes("CASH_AND_BANKS") || p.code.includes("BANK"),
    ) || [];
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;

  const navigate = useNavigate();

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const filterRef = useRef(null);
  const filterInstance = useRef(null);
  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);
  const modalUpdateRef = useRef(null);
  const modalUpdateInstance = useRef(null);
  const modalViewRef = useRef(null);
  const modalViewInstance = useRef(null);
  const modalDeleteRef = useRef(null);
  const modalDeleteInstance = useRef(null);

  const [data, setData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [countryFilterOptions, setCountryFilterOptions] = useState([]);
  const [search, setSearch] = useState({ value: "", checked: true });
  const [appliedFilters, setAppliedFilters] = useState({
    CODIGO_BANCO: "",
    NOMBRE_BANCO: "",
    NOMBRE_CORTO: "",
    TIPO_BANCO: "",
    PAIS_CODIGO: "",
    ESTADO: "",
  });

  const [bank, setBank] = useState({ ...INITIAL_BANK });
  const [originalBank, setOriginalBank] = useState({ ...INITIAL_BANK });

  const [bankCreate, setBankCreate] = useState(false);
  const [bankUpdate, setBankUpdate] = useState(false);
  const [bankDelete, setBankDelete] = useState(false);
  const [bankError, setBankError] = useState({ show: false, message: "" });
  const [queryResultInfo, setQueryResultInfo] = useState({ show: false, message: "", type: "info" });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const actions = [
    ...(userPermissions.some((p) => p.code === "VIEW_CASH_AND_BANKS" && p.type === "VIEW") || isAdmin
      ? [{ key: "view", icon: "ri-eye-line", class: "btn-label-info", title: "Ver" }]
      : []),
    ...(userPermissions.some((p) => p.code === "UPDATE_CASH_AND_BANKS" && p.type === "UPDATE") || isAdmin
      ? [{ key: "edit", icon: "ri-edit-line", class: "btn-label-primary", title: "Editar" }]
      : []),
    ...(userPermissions.some((p) => p.code === "DELETE_CASH_AND_BANKS" && p.type === "DELETE") || isAdmin
      ? [{ key: "delete", icon: "ri-delete-bin-5-line", class: "btn-label-danger", title: "Inactivar" }]
      : []),
    ...(userPermissions.some((p) => p.code === "VIEW_BANK_BRANCH" && p.type === "VIEW") || isAdmin
      ? [{ key: "view-branches", icon: "ri-home-office-line", class: "btn-label-info", title: "Ver sucursales" }]
      : []),
  ];

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
    }
    setBank({ ...INITIAL_BANK });
    modalCreateInstance.current.show();
  };

  const openModalUpdate = (row, isView = false) => {
    const normalized = normalizeBankFromRow(row);
    setBank(normalized);
    setOriginalBank(normalized);

    if (isView) {
      if (!modalViewInstance.current) {
        modalViewInstance.current = new window.bootstrap.Modal(modalViewRef.current);
      }
      modalViewInstance.current.show();
      return;
    }

    if (!modalUpdateInstance.current) {
      modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
    }
    modalUpdateInstance.current.show();
  };

  const openDeleteModal = (row) => {
    const normalized = normalizeBankFromRow(row);
    setDeleteTarget(normalized);
    setDeleteReason("");
    setDeleteConfirmation("");

    if (!modalDeleteInstance.current) {
      modalDeleteInstance.current = new window.bootstrap.Modal(modalDeleteRef.current);
    }
    modalDeleteInstance.current.show();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.ID_BANCO) return;

    // BNK-RF-08: la confirmacion debe ser EXACTAMENTE "INACTIVAR" (mayusculas,
    // sin espacios ni otros caracteres).
    if (deleteConfirmation !== "INACTIVAR") {
      setBankError({
        show: true,
        message: "BNK-ERR-057: Debe escribir exactamente INACTIVAR para confirmar",
      });
      return;
    }

    // BNK-RF-08: motivo min 40 / max 1000 + clase de caracteres.
    const motivoErr = validateText(deleteReason, {
      required: true,
      min: 40,
      max: 1000,
      patternKey: "description",
      label: "El motivo de desactivación",
    });
    if (motivoErr) {
      setBankError({ show: true, message: `BNK-ERR-058: ${motivoErr}` });
      return;
    }

    try {
      const url = base_url([...API_BASE, deleteTarget.ID_BANCO]);
      await fetchHelper.delete(url, null, {}, 1000, true);
      dataTableRef?.current?.ajax.reload();
      setBankDelete(true);
      setBankError({ show: false, message: "" });
      modalDeleteInstance.current?.hide();
    } catch (error) {
      setBankError({
        show: true,
        message: error?.msg || "BNK-ERR-059: Error al registrar la inactivacion",
      });
    }
  };

  const columns = [
    { title: "ID", data: "id", name: "id" },
    {
      title: "Codigo",
      data: "code",
      name: "code",
      render: (value) => highlightMatch(value, appliedFilters.CODIGO_BANCO, true),
    },
    {
      title: "Nombre",
      data: "name",
      name: "name",
      render: (value) => highlightMatch(value, appliedFilters.NOMBRE_BANCO),
    },
    {
      title: "Nombre corto",
      data: "nameShort",
      name: "nameShort",
      render: (value) => highlightMatch(value, appliedFilters.NOMBRE_CORTO),
    },
    {
      title: "Tipo",
      data: "typeBank",
      name: "typeBank",
      render: (value) => TYPE_BANK_LABELS[value] || value,
    },
    { title: "NIT", data: "nit", name: "nit" },
    {
      title: "Pais",
      data: "country.code",
      name: "country.code",
      render: (_, __, row) => row?.country?.code || "",
    },
    {
      title: "Estado",
      data: "status",
      name: "status",
      render: (status) => formatBankStatus(status),
    },
    {
      title: "Acciones",
      data: "id",
      orderable: false,
      render: (id, _, row) => {
        const bankCode = row?.code ?? "";
        const bankName = row?.name ?? "";
        return `
          <div class="d-flex gap-1">
            ${actions
              .map(
                (a) => `
                <button class="btn btn-sm ${a.class} action-btn"
                  data-action="${a.key}"
                  data-id="${id}"
                  data-code="${bankCode}"
                  data-name="${bankName}"
                  title="${a.title}">
                  <i class="ri ${a.icon}"></i>
                </button>
              `,
              )
              .join("")}
          </div>
        `;
      },
    },
  ];

  const buttons = [
    {
      text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2",
      action: function () {
        if (!filterInstance.current) {
          filterInstance.current = new window.bootstrap.Modal(filterRef.current);
        }
        filterInstance.current.show();
      },
    },
    ...(userPermissions.some((p) => p.code === "CREATE_CASH_AND_BANKS" && p.type === "CREATE") || isAdmin
      ? [
          {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear banco</span>',
            className: "btn rounded-pill btn-primary waves-effect mx-2 my-2",
            action: openModalCreate,
          },
        ]
      : []),
  ];

  useEffect(() => {
    const loadCountries = async () => {
      for (const endpoint of countryEndpointCandidates) {
        try {
          const url = base_url(endpoint);
          const response = await fetchHelper.post(
            url,
            { draw: 1, start: 0, length: 1000 },
            {},
            0,
            false,
          );
          const rows = response?.data?.data ?? response?.data ?? response?.data?.rows ?? [];
          const options = formatCountryOptions(rows);
          if (options.length > 0) {
            setCountries(options);
            setCountryFilterOptions(
              options.map((option) => ({
                id: option.code,
                label: option.label,
              })),
            );
            return;
          }
        } catch {
          // Try next endpoint candidate.
        }
      }
      setCountries([]);
      setCountryFilterOptions([]);
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function () {
      const action = $(this).data("action");
      const id = Number($(this).data("id"));
      const row = data.find((item) => Number(item.id ?? item.ID_BANCO ?? item.ID) === id);

      if (!row) {
        setBankError({
          show: true,
          message: "BNK-ERR-047: El banco seleccionado no esta disponible para edicion",
        });
        return;
      }

      if (action === "view") {
        openModalUpdate(row, true);
      }

      if (action === "edit") {
        openModalUpdate(row, false);
      }

      if (action === "delete") {
        openDeleteModal(row);
      }

      if (action === "view-branches") {
        navigate(`branches/${row.id}`);
      }
    };

    table.on("click", ".action-btn", handler);
    return () => table.off("click", ".action-btn", handler);
  }, [data]);

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function (e, settings, json) {
      if (!json || typeof json.recordsFiltered === "undefined") return;

      const hasFilter = Object.values(appliedFilters).some((value) => String(value || "").trim() !== "");
      if (!hasFilter) {
        setQueryResultInfo({ show: false, message: "", type: "info" });
        return;
      }

      if (Number(json.recordsFiltered) === 0) {
        setQueryResultInfo({
          show: true,
          message: "BNK-ERR-043: No existen bancos con esos criterios",
          type: "warning",
        });
        return;
      }

      setQueryResultInfo({
        show: true,
        message: `Se encontraron ${json.recordsFiltered} bancos con coincidencias`,
        type: "info",
      });
    };

    table.on("xhr.dt", handler);
    return () => table.off("xhr.dt", handler);
  }, [appliedFilters]);

  return (
    <>
      <div className="card">
        <h5 className="card-header text-md-start text-center">
          <i className="ri-bank-line me-2"></i>
          Catalogo de bancos
        </h5>

        <AlertPage
          type="success"
          message="El banco ha sido creado exitosamente en el catalogo"
          show={bankCreate}
          onChange={() => setBankCreate(false)}
        />
        <AlertPage
          type="success"
          message="El banco fue actualizado exitosamente"
          show={bankUpdate}
          onChange={() => setBankUpdate(false)}
        />
        <AlertPage
          type="success"
          message="El banco ha sido eliminado exitosamente"
          show={bankDelete}
          onChange={() => setBankDelete(false)}
        />
        <AlertPage
          type="danger"
          message={bankError.message}
          show={bankError.show}
          onChange={() => setBankError({ show: false, message: "" })}
        />
        <AlertPage
          type={queryResultInfo.type}
          message={queryResultInfo.message}
          show={queryResultInfo.show}
          onChange={() => setQueryResultInfo({ show: false, message: "", type: "info" })}
        />

        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={API_SEARCH}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Catalogo de Bancos"
            setData={setData}
            search={search}
            setSearch={setSearch}
            filtered={true}
            lengthMenu={[10, 20, 50, 100]}
          />
        </div>
      </div>

      <FilterCashAndBanks
        filterRef={filterRef}
        filterInstance={filterInstance}
        dataTableRef={dataTableRef}
        countries={countryFilterOptions}
        onApply={(filters) => setAppliedFilters(filters)}
      />

      <CreateCashAndBanks
        modalRef={modalCreateRef}
        modalInstance={modalCreateInstance}
        bank={bank}
        setBank={setBank}
        dataTableRef={dataTableRef}
        setBankCreate={setBankCreate}
        countries={countries}
      />

      <UpdatedCashAndBanks
        modalRef={modalViewRef}
        modalInstance={modalViewInstance}
        bank={bank}
        setBank={setBank}
        originalBank={originalBank}
        dataTableRef={dataTableRef}
        setBankUpdate={setBankUpdate}
        countries={countries}
        readOnly
      />

      <UpdatedCashAndBanks
        modalRef={modalUpdateRef}
        modalInstance={modalUpdateInstance}
        bank={bank}
        setBank={setBank}
        originalBank={originalBank}
        dataTableRef={dataTableRef}
        setBankUpdate={setBankUpdate}
        countries={countries}
      />

      <div className="modal fade" ref={modalDeleteRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <span className="text-warning me-2">
                <i className="ri-error-warning-line fs-2"></i>
              </span>
              <h4 className="modal-title fw-bold">Inactivar banco</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <p className="text-body mb-2">
                Banco seleccionado: <strong>{deleteTarget?.CODIGO_BANCO}</strong> - {deleteTarget?.NOMBRE_BANCO}
              </p>
              <p className="text-muted mb-2">
                Esta accion realiza eliminacion logica cambiando el estado a INACTIVE.
              </p>
              <label className="form-label">Motivo de eliminacion (entre 40 y 1000 caracteres)</label>
              <textarea
                className="form-control mb-3"
                rows={5}
                maxLength={1000}
                value={deleteReason}
                onChange={(e) => setDeleteReason(sanitizeSimpleText(e.target.value, 1000))}
                placeholder="Describa el motivo (minimo 40 caracteres)"
              />

              <label className="form-label">
                Confirmacion reforzada: escriba <strong>INACTIVAR</strong>
              </label>
              <input
                className="form-control"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                placeholder="INACTIVAR"
                maxLength={20}
              />
            </div>
            <div className="modal-footer justify-content-end">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Confirmar inactivacion
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IndexCashAndBanks;
