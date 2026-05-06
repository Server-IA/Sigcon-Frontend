import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import AlertPage from '@/components/molecules/AlertPage';
import DataTableReference from '@/components/organism/DataTable';

import CreateBankAccount from './CreateBankAccount';
import UpdateBankAccount from './UpdateBankAccount';
import ViewBankAccount from './ViewBankAccount';
import FilterBankAccount from './FilterBankAccount';
import DeleteBankAccount from './DeleteBankAccount';
import StatusBankAccount from './StatusBankAccount';

import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

// ─── Constantes ──────────────────────────────────────────────────────────────

export const ACCOUNT_TYPES = [
    { id: 'CORRIENTE',       label: 'Corriente' },
    { id: 'AHORROS',         label: 'Ahorros' },
    { id: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
];

export const STATUS_LABELS = {
    ACTIVA:     'Activa',
    INACTIVA:   'Inactiva',
    SUSPENDIDA: 'Suspendida',
    CERRADA:    'Cerrada',
};

export const STATUS_BADGE = {
    ACTIVA:     'bg-label-success',
    INACTIVA:   'bg-label-secondary',
    SUSPENDIDA: 'bg-label-warning',
    CERRADA:    'bg-label-danger',
};

export const emptyRecord = {
    id:               '',
    code:             '',
    accountNumber:    '',
    accountName:      '',
    accountType:      '',
    bankId:           '',
    currencyTypeId:   '',
    initialBalance:   0,
    accountingAccountId: '',
    bankBranchId:     '',
    branchName:       '',
    accountExecutive: '',
    bankPhone:        '',
    description:      '',
    openingDate:      '',
    allowsOverdraft:  false,
    creditLimit:      0,
    notifyLowBalance: false,
    minimumBalance:   0,
    handlesCheckbook: false,
    costCenterId:     '',
    bookId:           '',
    status:           '',
    accountNumberMasked: '',
    bankName:         '',
    currencyCode:     '',
    chartOfAccountCode:  '',
    chartOfAccountName:  '',
    companyName:      '',
    changeReason:     '',
};

// ─── Componente principal ─────────────────────────────────────────────────────

const IndexBankAccounts = () => {

    const navigate = useNavigate();
    const isAdmin = useSelector((state) => state.user.user)?.isAdmin || false;
    const user    = useSelector((state) => state.user).user;

    const tableRef     = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef      = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef      = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalViewRef      = useRef(null);
    const modalViewInstance = useRef(null);

    const modalDeleteRef      = useRef(null);
    const modalDeleteInstance = useRef(null);

    const modalStatusRef      = useRef(null);
    const modalStatusInstance = useRef(null);

    const [data,           setData]           = useState([]);
    const [selectedRecord, setSelectedRecord] = useState({ ...emptyRecord });
    const [message,        setMessage]        = useState({ message: '', type: '', show: false });
    const [search,         setSearch]         = useState({ value: '', checked: true });

    // ── Datos para selects ────────────────────────────────────────────────────
    const [banks,            setBanks]            = useState([]);
    const [currencyTypes,    setCurrencyTypes]    = useState([]);
    const [accountingAccounts,  setAccountingAccounts]  = useState([]);
    const [costCenters,      setCostCenters]      = useState([]);

    // ── Flags para apertura reactiva de modales ───────────────────────────────
    const [clickView,   setClickView]   = useState(false);
    const [clickEdit,   setClickEdit]   = useState(false);
    const [clickDelete, setClickDelete] = useState(false);
    const [clickStatus, setClickStatus] = useState(false);

    const loadData = async () => {
        try {
            const payload = { length: -1 };

            const [banksRes, currencyRes, accountingAccountsRes, costCentersRes] =
                await Promise.allSettled([
                    fetchHelper.post(base_url(['api', 'v1', 'banks', 'search']),          payload, {}, 1),
                    fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']), payload, {}, 1),
                    fetchHelper.post(base_url(['api', 'v1', 'accounting-accounts']),       {
                        ...payload,
                        columns: [{ data: 'pucAccount.code', search: { value: "1110%", regex: true } }],
                    }, {}, 1),
                    fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']),    payload, {}, 1),
                ]);

            if (banksRes.status === 'fulfilled')
                setBanks(banksRes.value.data?.map(d => ({ id: d.id, label: d.name, branches: d.branches })) || []);

            if (currencyRes.status === 'fulfilled')
                setCurrencyTypes(currencyRes.value.data?.map(d => ({ id: d.id, label: `${d.isoCode} - ${d.name}` })) || []);

            if (accountingAccountsRes.status === 'fulfilled')
                setAccountingAccounts(accountingAccountsRes.value.data?.map(d => ({ id: d.id, label: `${d.pucAccount?.code || ''} - ${d.customName || d.pucAccount?.name}` })) || []);

            if (costCentersRes.status === 'fulfilled')
                setCostCenters(costCentersRes.value.data?.map(d => ({ id: d.id, label: d.name })) || []);

        } catch (error) {
            console.error('Error cargando datos de selects:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        console.log("selectedRecord", selectedRecord);
    }, [selectedRecord]);

    // ── Columnas DataTable ────────────────────────────────────────────────────

    const columns = [
        { title: 'Código',       data: 'code',               name: 'code' },
        { title: 'N° Cuenta',    data: 'accountNumberMasked', name: 'accountNumberMasked' },
        { title: 'Nombre',       data: 'accountName',         name: 'accountName' },
        { title: 'Tipo',         data: 'accountType',         name: 'accountType',
            render: (v) => ACCOUNT_TYPES.find(t => t.id === v)?.label || v || '-',
        },
        // QA HU-005 E1: el `name` apunta al atributo JPA real (bank.name).
        // Antes era `bankName` (no existe) -> crash *"Could not resolve attribute 'bankDTO'..."*.
        { title: 'Banco',        data: 'bankDTO.name',            name: 'bank.name' },
        // QA-BLOQUE-AY (2026-05-06): mostrar saldo ACTUAL = initial + sum movimientos.
        // Antes solo mostraba initialBalance (saldo de apertura), por eso el contador
        // no veia descontados los pagos a proveedores ni los movimientos posteriores.
        { title: 'Saldo',        data: 'currentBalance',        name: 'initialBalance',
            render: (v, _, row) => formatPrice(v ?? row.initialBalance ?? 0, row.currencyTypeDTO?.isoCode) },
        { title: 'Moneda',       data: 'currencyTypeDTO.isoCode',        name: 'currencyType.isoCode' },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (v) => v
                ? `<span class="badge ${STATUS_BADGE[v] || 'bg-label-secondary'}">${STATUS_LABELS[v] || v}</span>`
                : '-',
        },
        { title: 'Fecha Apertura', data: 'openingDate', name: 'openingDate', searchable: false },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver detalle">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="reconcile" data-id="${id}" title="Conciliación bancaria">
                        <i class="ri-scales-3-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-primary action-btn"
                        data-action="edit" data-id="${id}" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-warning action-btn"
                        data-action="status" data-id="${id}" title="Cambiar estado">
                        <i class="ri-refresh-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn"
                        data-action="delete" data-id="${id}" title="Eliminar">
                        <i class="ri-delete-bin-5-line"></i>
                    </button>
                </div>`,
        },
    ];

    // ── Apertura modales ──────────────────────────────────────────────────────

    const openModalCreate = () => {
        if (!modalCreateInstance.current)
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        setSelectedRecord({ ...emptyRecord });
        modalCreateInstance.current.show();
    };

    useEffect(() => {
        if (!clickView) return;
        if (!modalViewInstance.current)
            modalViewInstance.current = new window.bootstrap.Modal(modalViewRef.current);
        modalViewInstance.current.show();
        setClickView(false);
    }, [clickView]);

    useEffect(() => {
        if (!clickEdit) return;
        if (!modalUpdateInstance.current)
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        modalUpdateInstance.current.show();
        setClickEdit(false);
    }, [clickEdit]);

    useEffect(() => {
        if (!clickDelete) return;
        if (!modalDeleteInstance.current)
            modalDeleteInstance.current = new window.bootstrap.Modal(modalDeleteRef.current);
        modalDeleteInstance.current.show();
        setClickDelete(false);
    }, [clickDelete]);

    useEffect(() => {
        if (!clickStatus) return;
        if (!modalStatusInstance.current)
            modalStatusInstance.current = new window.bootstrap.Modal(modalStatusRef.current);
        modalStatusInstance.current.show();
        setClickStatus(false);
    }, [clickStatus]);

    // ── Handler de acciones de la tabla ──────────────────────────────────────

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const ref    = data.find(r => r.id === id);

            if (!ref && action !== 'view') {
                console.warn('Cuenta no encontrada en data', id);
                return;
            }

            if (ref) {
                setSelectedRecord({
                    id:                  ref.id               ?? '',
                    used:                ref.used             ?? false,
                    code:                ref.code             ?? '',
                    accountNumber:       ref.accountNumber    ?? '',
                    accountNumberMasked: ref.accountNumberMasked ?? '',
                    accountName:         ref.accountName      ?? '',
                    accountType:         ref.accountType      ?? '',
                    bankId:              ref.bankId           ?? '',
                    bank:                ref.bankDTO          ?? '',
                    currencyTypeId:      ref.currencyTypeId   ?? '',
                    currency:            ref.currencyTypeDTO  ?? '',
                    initialBalance:      ref.initialBalance   ?? 0,
                    accountingAccountId: ref.accountingAccountId ?? '',
                    status:              ref.status           ?? '',
                    openingDate:         ref.openingDate      ?? '',
                    accountingAccount:   ref.accountingAccount ?? '',
                    costCenter:          ref.costCenterDTO    ?? '',
                    bankBranchId:        ref.bankBranchId    ?? '',
                    bankBranch:          ref.bankBranchDTO    ?? '',
                    accountExecutive:    ref.accountExecutive ?? '',
                    bankPhone:           ref.bankPhone        ?? '',
                    description:         ref.description      ?? '',
                    allowsOverdraft:     ref.allowsOverdraft  ?? false,
                    creditLimit:         ref.creditLimit      ?? 0,
                    notifyLowBalance:    ref.notifyLowBalance ?? false,
                    minimumBalance:      ref.minimumBalance   ?? 0,
                    handlesCheckbook:    ref.handlesCheckbook ?? false,
                    costCenterId:        ref.costCenterDTO?.id     ?? '',
                    bookId:              ref.bookId           ?? '',
                    changeReason:        '',
                });
            } else {
                setSelectedRecord({ ...emptyRecord, id });
            }

            switch (action) {
                case 'view':   setClickView(true);   break;
                case 'edit':   setClickEdit(true);   break;
                case 'delete': setClickDelete(true); break;
                case 'status': setClickStatus(true); break;
                case 'reconcile':
                    navigate(`/cash-and-banks/bank-reconciliation/${id}`);
                    break;
                default: console.warn('Acción no reconocida', action);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data, navigate]);

    // ── Botones DataTable ─────────────────────────────────────────────────────

    const openFilter = () => {
        if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
        filterInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-3-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () { openFilter(); },
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Añadir Cuenta</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); },
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">
                    Cuentas Bancarias
                </h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={['api', 'v1', 'bank-accounts', 'search']}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Cuentas Bancarias"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>
            </div>

            {/* ── Modales (fuera del card para evitar overflow) ─────────────── */}

            <CreateBankAccount
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                banks={banks}
                currencyTypes={currencyTypes}
                accountingAccounts={accountingAccounts}
                costCenters={costCenters}
                accountTypes={ACCOUNT_TYPES}
            />

            <UpdateBankAccount
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                costCenters={costCenters}
                banks={banks}
                currencyTypes={currencyTypes}
                accountingAccounts={accountingAccounts}
            />

            <ViewBankAccount
                modalRef={modalViewRef}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                accountTypes={ACCOUNT_TYPES}
                statusLabels={STATUS_LABELS}
                statusBadge={STATUS_BADGE}
            />

            <DeleteBankAccount
                modalRef={modalDeleteRef}
                modalInstance={modalDeleteInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <StatusBankAccount
                modalRef={modalStatusRef}
                modalInstance={modalStatusInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                statusLabels={STATUS_LABELS}
            />

            <FilterBankAccount
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                banks={banks.map(b => ({ id: b.name || b.label, name: b.name || b.label }))}
                currencies={currencyTypes.map(c => ({ id: c.isoCode || c.label, name: c.name || c.label }))}
            />
        </>
    );
};

export default IndexBankAccounts;
