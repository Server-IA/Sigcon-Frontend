import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { highlightMatch, formatBankStatus } from "../../../utils/bankUtils";

import CreateBankBranch from "./create";
import UpdatedBankBranch from "./updated";
import FilterBankBranch from "./filter";

const API_BASE = ["api", "v1", "bank-branches"];
const API_BANKS_SEARCH = ["api", "v1", "banks", "search"];

const INITIAL_BRANCH = {
  id: null,
  bankId: "",
  bankName: "",
  bankCode: "",
  address: "",
  city: "",
  mainBranch: false,
  status: "",
};

const normalizeBankOptions = (payload) => {
  const rows =
    payload?.data?.data ?? payload?.data ?? payload?.rows ?? payload ?? [];

  return rows
    .map((row) => {
      const id = row.id ?? row.ID_BANCO ?? row.ID ?? null;
      const code = row.code ?? row.CODIGO_BANCO ?? "";
      const name = row.name ?? row.NOMBRE_BANCO ?? "";
      if (id === null || id === undefined) return null;
      return {
        id: String(id),
        label: `${code ? `${code} - ` : ""}${name}`.trim(),
      };
    })
    .filter(Boolean);
};

const normalizeBranchFromRow = (row = {}) => ({
  id: row.id ?? row.ID ?? row.branchId ?? null,
  bankId: String(row.bankId ?? row.bank?.id ?? row.BANK_ID ?? ""),
  bankName: row.bank?.name ?? row.bankName ?? row.BANK_NAME ?? "",
  bankCode: row.bank?.code ?? row.bankCode ?? row.BANK_CODE ?? "",
  address: row.address ?? row.ADDRESS ?? "",
  city: row.city ?? row.CITY ?? "",
  mainBranch: row.mainBranch ?? row.main ?? row.MAIN_BRANCH ?? false,
  status: row.status ?? row.ESTADO ?? "",
});

const IndexBankBranches = () => {
  const userPermissions =
    useSelector((state) => state.user.user)?.permissions?.filter(
      (p) => p.code.includes("BANK_BRANCH") || p.code.includes("CASH_AND_BANKS"),
    ) || [];
  const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const selectedBankIdRef = useRef("");
  const filterRef = useRef(null);
  const filterInstance = useRef(null);
  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);
  const modalUpdateRef = useRef(null);
  const modalUpdateInstance = useRef(null);

  const [data, setData] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [search, setSearch] = useState({ value: "", checked: true });
  const [appliedFilters, setAppliedFilters] = useState({
    city: "",
    mainBranch: "",
  });

  const [branch, setBranch] = useState({ ...INITIAL_BRANCH });

  const [branchCreate, setBranchCreate] = useState(false);
  const [branchUpdate, setBranchUpdate] = useState(false);
  const [branchDelete, setBranchDelete] = useState(false);
  const [branchError, setBranchError] = useState({ show: false, message: "" });

  const seedData = [
    {
      id: "",
      bankId: "",
      city: "",
      address: "",
      mainBranch: false,
      status: "",
    },
  ];

  const actions = [
    ...(userPermissions.some((p) => p.code === "UPDATE_BANK_BRANCHES" && p.type === "UPDATE") || isAdmin
      ? [{ key: "edit", icon: "ri-edit-line", class: "btn-label-primary", title: "Editar" }]
      : []),
    ...(userPermissions.some((p) => p.code === "DELETE_BANK_BRANCHES" && p.type === "DELETE") || isAdmin
      ? [{ key: "delete", icon: "ri-delete-bin-5-line", class: "btn-label-danger", title: "Eliminar" }]
      : []),
  ];

  const resolveBankLabel = (row = {}) => {
    const bankId = String(
      row.bankId ?? row.bank?.id ?? row.BANK_ID ?? selectedBankId ?? "",
    );
    const rowLabel = row.bankLabel ?? row.BANK_LABEL ?? "";
    const bankName = row.bank?.name ?? row.bankName ?? row.BANK_NAME ?? "";
    const bankCode = row.bank?.code ?? row.bankCode ?? row.BANK_CODE ?? "";

    if (rowLabel) return String(rowLabel);

    if (bankName || bankCode) {
      return `${bankCode ? `${bankCode} - ` : ""}${bankName}`.trim();
    }

    if (!bankId) return "";
    const match = banks.find((bank) => String(bank.id) === bankId);
    return match?.label || "";
  };

  const columns = [
    { title: "ID", data: "id", name: "id" },
    {
      title: "Banco",
      data: "bankId",
      name: "bankId",
      render: (_, __, row) => {
        const label = resolveBankLabel(row);
        return label || "-";
      },
    },
    {
      title: "Ciudad",
      data: "city",
      name: "city",
      render: (value) => highlightMatch(value, appliedFilters.city),
    },
    {
      title: "Direccion",
      data: "address",
      name: "address",
      render: (value) => highlightMatch(value, ""),
    },
    {
      title: "Principal",
      data: "mainBranch",
      name: "mainBranch",
      render: (value) =>
        value
          ? '<span class="badge bg-label-primary">Principal</span>'
          : '<span class="badge bg-label-secondary">Secundaria</span>',
    },
    {
      title: "Estado",
      data: "status",
      name: "status",
      render: (value) => formatBankStatus(value || "ACTIVE"),
    },
    {
      title: "Acciones",
      data: "id",
      orderable: false,
      render: (id, _, row) => {
        const bankName = row?.bank?.name ?? row?.bankName ?? "";
        return `
          <div class="d-flex gap-1">
            ${actions
              .map(
                (a) => `
                <button class="btn btn-sm ${a.class} action-btn"
                  data-action="${a.key}"
                  data-id="${id}"
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

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
    }
    setBranch({ ...INITIAL_BRANCH, bankId: selectedBankId || "" });
    modalCreateInstance.current.show();
  };

  const openModalUpdate = (row) => {
    if (!modalUpdateInstance.current) {
      modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
    }
    setBranch(normalizeBranchFromRow(row));
    modalUpdateInstance.current.show();
  };

  const handleDelete = async (row) => {
    const result = await window.Swal.fire({
      title: "Estas seguro?",
      text: `Se eliminara la sucursal ${row?.city || ""}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "btn btn-danger",
        cancelButton: "btn btn-secondary",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const url = base_url([...API_BASE, row.id]);
      await fetchHelper.delete(url, null, {}, 1000, true);
      setBranchDelete(true);
    } catch (error) {
      setBranchError({
        show: true,
        message: error?.msg || "No se pudo eliminar la sucursal",
      });
    } finally {
      await refreshBranches();
    }
  };

  const canCreate =
    userPermissions.some((p) => p.code === "CREATE_BANK_BRANCHES" && p.type === "CREATE") ||
    isAdmin;

  const buttons = [
    {
      text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2",
      action: function () {
        if (!selectedBankIdRef.current) {
          setBranchError({
            show: true,
            message: "Seleccione un banco para filtrar sucursales",
          });
          return;
        }
        if (!filterInstance.current) {
          filterInstance.current = new window.bootstrap.Modal(filterRef.current);
        }
        filterInstance.current.show();
      },
    },
    ...(canCreate
      ? [
          {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear sucursal</span>',
            className: "btn rounded-pill btn-primary waves-effect mx-2 my-2",
            action: function () {
              if (!selectedBankIdRef.current) {
                setBranchError({
                  show: true,
                  message: "Seleccione un banco para crear una sucursal",
                });
                return;
              }
              openModalCreate();
            },
          },
        ]
      : []),
  ];

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const url = base_url(API_BANKS_SEARCH);
        const response = await fetchHelper.post(
          url,
          { draw: 1, start: 0, length: 1000 },
          {},
          0,
          false,
        );
        setBanks(normalizeBankOptions(response));
      } catch (error) {
        setBanks([]);
      }
    };

    loadBanks();
  }, []);

  const refreshBranches = async (bankId = selectedBankId) => {
    if (!bankId) {
      setData([]);
      setBranchesLoaded(false);
      return;
    }

    try {
      const bankLabel =
        banks.find((bank) => String(bank.id) === String(bankId))?.label || "";
      const url = base_url([...API_BASE, "bank", bankId]);
      const response = await fetchHelper.get(url, {}, 0, false);
      const rows = response?.data ?? response?.rows ?? response ?? [];
      const normalized = Array.isArray(rows)
        ? rows
            .map((row) => ({
            ...row,
            bankId: String(bankId),
            bankLabel,
            status: row.status ?? row.ESTADO ?? "ACTIVE",
            }))
            .sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0))
        : [];
      setData(normalized);
      setBranchesLoaded(true);
    } catch (error) {
      setData([]);
      setBranchesLoaded(true);
      setBranchError({
        show: true,
        message: error?.msg || "No se pudieron cargar las sucursales del banco",
      });
    }
  };

  useEffect(() => {
    selectedBankIdRef.current = selectedBankId;
    refreshBranches();
  }, [selectedBankId]);

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    table.clear();
    if (data.length > 0) {
      table.rows.add(data);
    }
    table.draw();
  }, [data]);

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function () {
      const action = $(this).data("action");
      const id = Number($(this).data("id"));
      const row = data.find((item) => Number(item.id ?? item.ID ?? item.branchId) === id);

      if (!row) {
        setBranchError({
          show: true,
          message: "No se encontro la sucursal seleccionada",
        });
        return;
      }

      if (action === "edit") {
        openModalUpdate(row);
        return;
      }

      if (action === "delete") {
        handleDelete({ ...normalizeBranchFromRow(row), id });
      }
    };

    table.on("click", ".action-btn", handler);
    return () => table.off("click", ".action-btn", handler);
  }, [data]);

  return (
    <>
      <div className="card">
        <h5 className="card-header text-md-start text-center">
          <i className="ri-bank-line me-2"></i>
          Sucursales bancarias
        </h5>

        <AlertPage
          type="success"
          message="Sucursal registrada correctamente"
          show={branchCreate}
          onChange={() => setBranchCreate(false)}
        />
        <AlertPage
          type="success"
          message="Sucursal actualizada correctamente"
          show={branchUpdate}
          onChange={() => setBranchUpdate(false)}
        />
        <AlertPage
          type="success"
          message="Sucursal eliminada correctamente"
          show={branchDelete}
          onChange={() => setBranchDelete(false)}
        />
        <AlertPage
          type="danger"
          message={branchError.message}
          show={branchError.show}
          onChange={() => setBranchError({ show: false, message: "" })}
        />

        <div className="px-4 pt-4 mb-3">
          <div className="row g-4 align-items-end">
            <div className="col-12 col-lg-7">
              <InputSelectModal
                id="BANK_BRANCHES_BANK"
                label="Banco"
                options={banks}
                value={selectedBankId}
                onChange={(value) => {
                  setSelectedBankId(value || "");
                  setAppliedFilters({ city: "", mainBranch: "" });
                }}
                placeholder="Seleccione un banco"
                required
              />
            </div>
          </div>
        </div>

        {selectedBankId && branchesLoaded && data.length === 0 ? (
          <div className="px-4 pb-4">
            <div className="alert alert-info mb-0">
              El banco seleccionado no tiene sucursales registradas.
            </div>
          </div>
        ) : null}

        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={["api", "v1", "bank-branches", "bank", selectedBankId || "0"]}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={buttons}
            title="Sucursales bancarias"
            search={search}
            setSearch={setSearch}
            filtered={true}
            lengthMenu={[10, 20, 50, 100]}
            data={seedData}
          />
        </div>
      </div>

      <FilterBankBranch
        filterRef={filterRef}
        filterInstance={filterInstance}
        dataTableRef={dataTableRef}
        onApply={(filters) => setAppliedFilters(filters)}
      />

      <CreateBankBranch
        modalRef={modalCreateRef}
        modalInstance={modalCreateInstance}
        branch={branch}
        setBranch={setBranch}
        onRefresh={refreshBranches}
        setBranchCreate={setBranchCreate}
        banks={banks}
        selectedBankId={selectedBankId}
      />

      <UpdatedBankBranch
        modalRef={modalUpdateRef}
        modalInstance={modalUpdateInstance}
        branch={branch}
        setBranch={setBranch}
        onRefresh={refreshBranches}
        setBranchUpdate={setBranchUpdate}
        banks={banks}
      />
    </>
  );
};

export default IndexBankBranches;
