import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import InputDate from '../../../components/molecules/InputDate';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CreateBankAccount = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    banks,
    currencyTypes,
    chartOfAccounts,
    companies,
    costCenters,
    accountTypes,
}) => {
    const [errors, setErrors] = useState({});
    const [error,  setError]  = useState({ message: '', type: '', show: false });

    // Sucursales del banco seleccionado
    const [branches,        setBranches]        = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    // Limpiar errores y sucursales al cerrar
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;
        const reset = () => {
            setError({ message: '', type: '', show: false });
            setErrors({});
            setBranches([]);
        };
        el.addEventListener('hidden.bs.modal', reset);
        return () => el.removeEventListener('hidden.bs.modal', reset);
    }, [modalRef]);

    // Cargar sucursales cuando cambia el banco
    useEffect(() => {
        if (!record.bankId) {
            setBranches([]);
            setRecord(prev => ({ ...prev, bankBranchId: '', branchName: '' }));
            return;
        }

        const loadBranches = async () => {
            setLoadingBranches(true);
            setBranches([]);
            setRecord(prev => ({ ...prev, bankBranchId: '', branchName: '' }));
            try {
                const res = await fetchHelper.post(
                    base_url(['api', 'v1', 'banks', 'search']),
                    {
                        length: -1,
                        columns: [{ data: 'id', search: { value: String(record.bankId), regex: false } }],
                    },
                    {}, 1
                );

                // El endpoint puede retornar todas las sucursales del banco en data[0].branches
                // o puede retornar directamente la lista según la implementación del backend
                const bankData = res.data?.find(b => Number(b.id) === Number(record.bankId));
                const branchList = bankData?.branches || bankData?.sucursales || [];

                setBranches(
                    branchList.map(b => ({
                        id:    b.id,
                        label: b.name || b.branchName || b.nombre || `Sucursal ${b.id}`,
                    }))
                );
            } catch (err) {
                console.warn('No se pudieron cargar las sucursales:', err);
                setBranches([]);
            } finally {
                setLoadingBranches(false);
            }
        };

        loadBranches();
    }, [record.bankId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const body = {
                code:             record.code,
                accountNumber:    record.accountNumber,
                accountName:      record.accountName,
                accountType:      record.accountType,
                bankId:           Number(record.bankId)           || 0,
                currencyTypeId:   Number(record.currencyTypeId)   || 0,
                initialBalance:   Number(record.initialBalance)   || 0,
                chartOfAccountId: Number(record.chartOfAccountId) || 0,
                companyId:        Number(record.companyId)        || 0,
                bankBranchId:     Number(record.bankBranchId)     || 0,
                branchName:       record.branchName       || '',
                accountExecutive: record.accountExecutive || '',
                bankPhone:        record.bankPhone        || '',
                description:      record.description      || '',
                openingDate:      record.openingDate      || null,
                allowsOverdraft:  record.allowsOverdraft  || false,
                creditLimit:      Number(record.creditLimit)   || 0,
                notifyLowBalance: record.notifyLowBalance || false,
                minimumBalance:   Number(record.minimumBalance) || 0,
                handlesCheckbook: record.handlesCheckbook || false,
                costCenterId:     Number(record.costCenterId) || 0,
                bookId:           Number(record.bookId)       || 0,
            };

            await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'store']), body, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setMessage({ message: 'Cuenta bancaria creada correctamente.', type: 'success', show: true });

        } catch (err) {
            console.error(err);
            if (err?.errors?.length) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            } else if (err?.msg) {
                setError({ message: err.msg, type: 'danger', show: true });
            }
        }
    };

    const field = (key, val) => setRecord(prev => ({ ...prev, [key]: val }));

    // Hoy como fecha máxima (formato flatpickr 'today')
    const TODAY = 'today';

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-bank-line me-2"></i>Nueva Cuenta Bancaria
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={error.message}
                            type={error.type}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
                        />

                        {/* ── Sección: Identificación ─────────────────────── */}
                        <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                            <i className="ri-file-list-3-line me-1"></i>Identificación
                        </p>
                        <div className="row mb-4">
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="text" id="ba_code" label="Código"
                                    placeholder="Ej: BANC-001"
                                    value={record.code}
                                    onChange={e => field('code', e.target.value)}
                                    error={errors.code} required
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="text" id="ba_accountNumber" label="Número de cuenta"
                                    placeholder="Ej: 1234567890"
                                    value={record.accountNumber}
                                    onChange={e => field('accountNumber', e.target.value)}
                                    error={errors.accountNumber} required
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="text" id="ba_accountName" label="Nombre de cuenta"
                                    placeholder="Ej: Cuenta Corriente Principal"
                                    value={record.accountName}
                                    onChange={e => field('accountName', e.target.value)}
                                    error={errors.accountName} required
                                />
                            </div>
                        </div>

                        {/* ── Sección: Clasificación ──────────────────────── */}
                        <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                            <i className="ri-settings-3-line me-1"></i>Clasificación
                        </p>
                        <div className="row mb-4">
                            <div className="col-md-3 mb-4">
                                <InputSelectModal
                                    id="ba_accountType" label="Tipo de cuenta"
                                    value={record.accountType}
                                    onChange={v => field('accountType', v)}
                                    options={accountTypes}
                                    error={errors.accountType} required
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputSelectModal
                                    id="ba_bankId" label="Banco"
                                    value={record.bankId}
                                    onChange={v => field('bankId', v)}
                                    options={banks}
                                    error={errors.bankId} required
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputSelectModal
                                    id="ba_currencyTypeId" label="Moneda"
                                    value={record.currencyTypeId}
                                    onChange={v => field('currencyTypeId', v)}
                                    options={currencyTypes}
                                    error={errors.currencyTypeId} required
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputSelectModal
                                    id="ba_companyId" label="Empresa"
                                    value={record.companyId}
                                    onChange={v => field('companyId', v)}
                                    options={companies}
                                    error={errors.companyId} required
                                />
                            </div>
                        </div>

                        {/* ── Sección: Contabilidad ───────────────────────── */}
                        <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                            <i className="ri-book-2-line me-1"></i>Contabilidad
                        </p>
                        <div className="row mb-4">
                            <div className="col-md-4 mb-4">
                                <InputSelectModal
                                    id="ba_chartOfAccountId" label="Cuenta PUC"
                                    value={record.chartOfAccountId}
                                    onChange={v => field('chartOfAccountId', v)}
                                    options={chartOfAccounts}
                                    error={errors.chartOfAccountId} required
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="number" id="ba_initialBalance" label="Saldo inicial"
                                    placeholder="0"
                                    value={record.initialBalance}
                                    onChange={e => field('initialBalance', Number(e.target.value))}
                                    error={errors.initialBalance}
                                    min={0}
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputSelectModal
                                    id="ba_costCenterId" label="Centro de costo"
                                    value={record.costCenterId}
                                    onChange={v => field('costCenterId', v)}
                                    options={costCenters}
                                    clearable
                                />
                            </div>
                        </div>

                        {/* ── Sección: Sucursal y contacto ───────────────── */}
                        <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                            <i className="ri-map-pin-line me-1"></i>Sucursal y contacto
                        </p>
                        <div className="row mb-4">

                            {/* Sucursal: select si hay sucursales del banco, texto libre si no */}
                            <div className="col-md-3 mb-4">
                                {!record.bankId ? (
                                    /* Sin banco seleccionado: campo deshabilitado */
                                    <InputModal
                                        type="text" id="ba_branchName_disabled" label="Sucursal"
                                        placeholder="Seleccione primero un banco"
                                        value=""
                                        onChange={() => {}}
                                        disabled
                                    />
                                ) : loadingBranches ? (
                                    /* Cargando sucursales */
                                    <div className="form-floating form-floating-outline">
                                        <input
                                            type="text" className="form-control"
                                            placeholder="Cargando..."
                                            value="Cargando sucursales..."
                                            disabled readOnly
                                        />
                                        <label>Sucursal</label>
                                    </div>
                                ) : branches.length > 0 ? (
                                    /* Sucursales disponibles: select */
                                    <InputSelectModal
                                        id="ba_bankBranchId" label="Sucursal"
                                        value={record.bankBranchId}
                                        onChange={v => {
                                            const branch = branches.find(b => String(b.id) === String(v));
                                            field('bankBranchId', v);
                                            if (branch) field('branchName', branch.label);
                                        }}
                                        options={branches}
                                        error={errors.bankBranchId}
                                        clearable
                                    />
                                ) : (
                                    /* Sin sucursales en el backend: texto libre */
                                    <InputModal
                                        type="text" id="ba_branchName" label="Sucursal"
                                        placeholder="Ej: Sucursal Norte"
                                        value={record.branchName}
                                        onChange={e => field('branchName', e.target.value)}
                                        error={errors.branchName}
                                    />
                                )}
                            </div>

                            <div className="col-md-3 mb-4">
                                <InputModal
                                    type="text" id="ba_accountExecutive" label="Ejecutivo de cuenta"
                                    placeholder="Ej: Carlos Pérez"
                                    value={record.accountExecutive}
                                    onChange={e => field('accountExecutive', e.target.value)}
                                    error={errors.accountExecutive}
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputModal
                                    type="text" id="ba_bankPhone" label="Teléfono banco"
                                    placeholder="Ej: 6016543210"
                                    value={record.bankPhone}
                                    onChange={e => field('bankPhone', e.target.value)}
                                    error={errors.bankPhone}
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputDate
                                    id="ba_openingDate" label="Fecha apertura"
                                    date={record.openingDate}
                                    dateFormat="Y-m-d"
                                    maxDate={TODAY}
                                    onChange={date => field('openingDate', date)}
                                    error={errors.openingDate}
                                />
                            </div>
                        </div>

                        {/* ── Sección: Descripción ───────────────────────── */}
                        <div className="row mb-4">
                            <div className="col-md-12 mb-4">
                                <InputModal
                                    type="text" id="ba_description" label="Descripción"
                                    placeholder="Descripción opcional de la cuenta"
                                    value={record.description}
                                    onChange={e => field('description', e.target.value)}
                                    error={errors.description}
                                />
                            </div>
                        </div>

                        {/* ── Sección: Configuraciones ───────────────────── */}
                        <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                            <i className="ri-toggle-line me-1"></i>Configuraciones
                        </p>
                        <div className="row">
                            <div className="col-md-4 mb-4">
                                <div className="form-check form-switch mb-2">
                                    <input
                                        className="form-check-input" type="checkbox"
                                        id="ba_allowsOverdraft"
                                        checked={record.allowsOverdraft}
                                        onChange={e => field('allowsOverdraft', e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="ba_allowsOverdraft">
                                        Permite sobregiro
                                    </label>
                                </div>
                                {record.allowsOverdraft && (
                                    <InputModal
                                        type="number" id="ba_creditLimit" label="Límite de crédito"
                                        placeholder="0"
                                        value={record.creditLimit}
                                        onChange={e => field('creditLimit', Number(e.target.value))}
                                        error={errors.creditLimit} min={0}
                                    />
                                )}
                            </div>
                            <div className="col-md-4 mb-4">
                                <div className="form-check form-switch mb-2">
                                    <input
                                        className="form-check-input" type="checkbox"
                                        id="ba_notifyLowBalance"
                                        checked={record.notifyLowBalance}
                                        onChange={e => field('notifyLowBalance', e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="ba_notifyLowBalance">
                                        Notificar saldo mínimo
                                    </label>
                                </div>
                                {record.notifyLowBalance && (
                                    <InputModal
                                        type="number" id="ba_minimumBalance" label="Saldo mínimo"
                                        placeholder="0"
                                        value={record.minimumBalance}
                                        onChange={e => field('minimumBalance', Number(e.target.value))}
                                        error={errors.minimumBalance} min={0}
                                    />
                                )}
                            </div>
                            <div className="col-md-4 mb-4">
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input" type="checkbox"
                                        id="ba_handlesCheckbook"
                                        checked={record.handlesCheckbook}
                                        onChange={e => field('handlesCheckbook', e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="ba_handlesCheckbook">
                                        Maneja chequera
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            <i className="ri-save-line me-1"></i>Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBankAccount;
