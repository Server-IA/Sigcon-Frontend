import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import CreateCaja from './create';
import UpdatedCaja from './updated';
import FilterCaja from './filter';
import AlertPage from '../../../components/molecules/AlertPage';

const API_LIST   = ['api', 'v1', 'cash', 'search'];
const API_GET    = (id) => ['api', 'v1', 'cash', id];
const API_DELETE = (id) => ['api', 'v1', 'cash', 'delete', id];

// Mapea el DTO del backend al estado interno del formulario
const mapDTOToState = (row) => ({
    id:                      row.id                              ?? '',
    codigoCaja:              row.cashCode                        ?? '',
    nombreCaja:              row.cashName                        ?? '',   // typo en backend
    tipoCaja:                row.cashType                        ?? '',
    estadoCaja:              row.cashStatus                      ?? '',
    descripcion:             row.description                     ?? '',
    ubicacionFisica:         row.physicalLocation                ?? '',
    idResponsablePrincipal:  row.principalResponsibleId          ?? '',
    idResponsableSuplente:   row.alternateResponsibleId          ?? '',
    horarioOperacion:        row.operationSchedule               ?? '',
    monedaCodigo:            row.currencyId                      ?? '',
    saldoInicial:            row.initialBalanace                 ?? '',   // typo en backend
    fechaSaldoInicial:       row.initialBalanceDay               ?? '',
    fechaCreacionCaja:       row.cashCreationDate                ?? '',
    limiteMaximo:            row.maxLimit                        ?? '',
    limiteMinimo:            row.minLimit                        ?? '',
    requiereAutorizacion:    row.requiresAuthorization           ?? false,
    montoMaxSinAutorizacion: row.maxAmountWithoutAuthorization   ?? '',
    notificarLimite:         row.notifyLimit                     ?? '',
    periodicidadArqueo:      row.auditFrequency                  ?? '',
    idCuentaContable:        row.accountingAccountId             ?? '',
    centroCosto:             row.costCenterId                    ?? '',
    libroContable:           row.accountingBook                  ?? '',
    motivoCambio:            '',
});

const emptyCaja = {
    id: '',
    codigoCaja: '',
    nombreCaja: '',
    tipoCaja: '',
    estadoCaja: '',
    descripcion: '',
    ubicacionFisica: '',
    idResponsablePrincipal: '',
    idResponsableSuplente: '',
    horarioOperacion: '',
    monedaCodigo: '',
    saldoInicial: '',
    fechaSaldoInicial: '',
    fechaCreacionCaja: '',
    limiteMaximo: '',
    limiteMinimo: '',
    requiereAutorizacion: false,
    montoMaxSinAutorizacion: '',
    notificarLimite: '',
    periodicidadArqueo: '',
    idCuentaContable: '',
    centroCosto: '',
    libroContable: '',
    motivoCambio: '',
};

export default function IndexCashList() {
    const [data, setData]         = useState([]);
    const [caja, setCaja]         = useState(emptyCaja);
    const [viewMode, setViewMode] = useState(false);
    const [search, setSearch]     = useState({ value: '', checked: true });

    const [accountingAccounts, setAccountingAccounts] = useState([]);
    const [currencyTypes, setCurrencyTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [costCenters, setCostCenters] = useState([]);

    const [cajaCreate, setCajaCreate] = useState(false);
    const [cajaEdit,   setCajaEdit]   = useState(false);
    const [cajaDelete, setCajaDelete] = useState(false);
    const [cajaError,  setCajaError]  = useState(false);

    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef      = useRef(null);
    const modalUpdateInstance = useRef(null);
    const filterRef           = useRef(null);
    const filterInstance      = useRef(null);
    const modalDeleteRef      = useRef(null);
    const modalDeleteInstance = useRef(null);

    const [deleteTarget,  setDeleteTarget]  = useState({ id: null, nombre: '' });
    const [deleteKeyword, setDeleteKeyword] = useState('');
    const [deleteMotivo,  setDeleteMotivo]  = useState('');
    const [deleteError,   setDeleteError]   = useState('');

    const openConfirmDelete = (id, nombre) => {
        setDeleteTarget({ id, nombre });
        setDeleteKeyword('');
        setDeleteMotivo('');
        setDeleteError('');
        if (!modalDeleteInstance.current) {
            modalDeleteInstance.current = new window.bootstrap.Modal(modalDeleteRef.current);
        }
        modalDeleteInstance.current.show();
    };

    const loadData = async () => {
        const response = await fetchHelper.post(base_url([
            "api/v1/accounting-accounts"
        ]), { length: -1, columns:[
            {data: "pucAccount.code", searchable: true, search: {value: "1105%", regex: true}}
        ] }, {}, 0, false);
        setAccountingAccounts(response.data);

        const responseCurrencyTypes = await fetchHelper.post(base_url([
            "api/v1/accounting-lists/currency-types/search"
        ]), { length: -1 }, {}, 0, false);
        setCurrencyTypes(responseCurrencyTypes.data);

        const responseUsers = await fetchHelper.post(base_url([
            "users/getUsers"
        ]), { length: -1 }, {}, 0, false);
        const rawUsers = Array.isArray(responseUsers?.data) ? responseUsers.data
                           : (responseUsers?.data?.data || []);
        setUsers(rawUsers.map(u => ({
            id: u.id,
            name: `${u.name || ''} ${u.lastname || ''}`.trim() || u.email || `Usuario ${u.id}`,
        })));

        const responseCostCenters = await fetchHelper.post(base_url([
            "api/v1/cost-centers/search"
        ]), { length: -1 }, {}, 0, false);
        setCostCenters(responseCostCenters.data);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async () => {
        if (deleteKeyword !== 'ELIMINAR') {
            setDeleteError('Debes escribir la palabra ELIMINAR para confirmar.');
            return;
        }
        if (!deleteMotivo || deleteMotivo.trim().length < 40) {
            setDeleteError('El motivo debe tener mínimo 40 caracteres.');
            return;
        }
        try {
            const url = base_url(API_DELETE(deleteTarget.id)) + `?confirmation=${encodeURIComponent(deleteKeyword)}&reason=${encodeURIComponent(deleteMotivo.trim())}`;
            await fetchHelper.delete(url, {}, {}, 500, true);
            modalDeleteInstance.current?.hide();
            setCajaDelete(true);
            dataTableRef?.current?.ajax?.reload?.();
        } catch {
            modalDeleteInstance.current?.hide();
            setCajaError(true);
        }
    };

    const columns = [
        { title: 'Código',    data: 'cashCode',         name: 'cashCode' },
        { title: 'Nombre',    data: 'cashName',          name: 'cashName' },
        { title: 'Ubicación', data: 'physicalLocation',  name: 'physicalLocation' },
        {
            title: 'Tipo', data: 'cashType', name: 'cashType',
            render: (val) => ({ GENERAL: 'General', PETTY_CASH: 'Caja Menor', FIXED_FUND: 'Fondo Fijo' }[val] ?? val ?? '-'),
        },
        {
            title: 'Estado', data: 'cashStatus', name: 'cashStatus',
            render: (val) => {
                const color = { ACTIVE: 'success', INACTIVE: 'warning', CLOSED: 'secondary' }[val] ?? 'secondary';
                const label = { ACTIVE: 'Activa', INACTIVE: 'Inactiva', CLOSED: 'Cerrada' }[val] ?? val ?? '-';
                return `<span class="badge bg-label-${color}">${label}</span>`;
            },
        },
        {
            title: 'Saldo Actual', data: 'currentBalance', name: 'currentBalance',
            render: (val) => val != null ? Number(val).toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '-',
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (val) => `
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm btn-label-info action-btn"    data-action="view"   data-id="${val}" title="Ver datos"><i class="ri-eye-line"></i></button>
                    <button class="btn btn-sm btn-label-primary action-btn" data-action="edit"   data-id="${val}" title="Editar"><i class="ri-edit-line"></i></button>
                    <button class="btn btn-sm btn-label-danger action-btn"  data-action="delete" data-id="${val}" title="Eliminar"><i class="ri-delete-bin-5-line"></i></button>
                </div>`,
        },
    ];

    const buttons = [
        {
            text: '<i class="ri-add-line me-1"></i> Nueva Caja',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => {
                setCaja(emptyCaja);
                if (!modalCreateInstance.current) {
                    modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
                }
                modalCreateInstance.current.show();
            },
        },
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const row    = data.find(m => m.id === id);
            if (!row) return;

            switch (action) {
                case 'view':
                case 'edit': {
                    setCaja(mapDTOToState(row));
                    setViewMode(action === 'view');
                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                    }
                    modalUpdateInstance.current.show();
                    break;
                }
                case 'delete':
                    openConfirmDelete(row.id, row.cahsName ?? row.cashCode);
                    break;
                default:
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Cajas</h5>

                <AlertPage type="success" message="Caja registrada exitosamente."   show={cajaCreate} onChange={() => setCajaCreate(false)} />
                <AlertPage type="success" message="Caja actualizada exitosamente."  show={cajaEdit}   onChange={() => setCajaEdit(false)} />
                <AlertPage type="success" message="Caja eliminada exitosamente."    show={cajaDelete} onChange={() => setCajaDelete(false)} />
                <AlertPage type="danger"  message="Error al procesar la operación." show={cajaError}  onChange={() => setCajaError(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={API_LIST}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Cajas"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 75, 100]}
                    />
                </div>
                <FilterCaja
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                />
            </div>

            <CreateCaja
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                caja={caja}
                setCaja={setCaja}
                dataTableRef={dataTableRef}
                setCajaCreate={setCajaCreate}
                accountingAccounts={accountingAccounts}
                currencyTypes={currencyTypes}
                users={users}
                costCenters={costCenters}
            />

            <UpdatedCaja
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                caja={caja}
                setCaja={setCaja}
                dataTableRef={dataTableRef}
                setCajaEdit={setCajaEdit}
                readOnly={viewMode}
                accountingAccounts={accountingAccounts}
                currencyTypes={currencyTypes}
                users={users}
                costCenters={costCenters}
            />

            {/* Modal Confirmar Eliminación */}
            <div className="modal fade" ref={modalDeleteRef} tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title"><i className="ri-delete-bin-5-line me-2" />Eliminar Caja</h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
                        </div>
                        <div className="modal-body">
                            <p>¿Está seguro de eliminar la caja <strong>{deleteTarget.nombre}</strong>?</p>
                            <p className="text-muted small mb-3">Esta acción es <strong>irreversible</strong>. Escribe <kbd>ELIMINAR</kbd> para confirmar.</p>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Confirmación <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" placeholder="Escribe ELIMINAR"
                                    value={deleteKeyword} onChange={e => setDeleteKeyword(e.target.value)} />
                            </div>
                            <div className="mb-2">
                                <label className="form-label fw-semibold">Motivo <span className="text-danger">*</span></label>
                                <textarea className="form-control" rows={3} placeholder="Mínimo 40 caracteres"
                                    value={deleteMotivo} onChange={e => setDeleteMotivo(e.target.value)} maxLength={500} />
                                <small className="text-muted">{deleteMotivo.length}/500 (mínimo 40)</small>
                            </div>
                            {deleteError && <div className="alert alert-danger py-2 mt-2">{deleteError}</div>}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                <i className="ri-delete-bin-5-line me-1" />Eliminar definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
