import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const UpdateBankAccount = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    costCenters,
    banks,
    currencyTypes,
}) => {
    const [errors, setErrors] = useState({});
    const [error,  setError]  = useState({ message: '', type: '', show: false });

    // Sucursales del banco asociado a la cuenta
    const [branches,        setBranches]        = useState([]);
    // const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingDetail,   setLoadingDetail]   = useState(false);

    // ── Al abrir el modal: cargar detalle completo (GET /{id}) ────────────────
    // El endpoint de búsqueda (DataTable) NO devuelve allowsOverdraft, creditLimit, etc.
    // Solo GET /{id} trae todos los campos
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        // const onShow = async () => {
        //     if (!record.id) return;
        //     setLoadingDetail(true);
        //     setError({ message: '', type: '', show: false });
        //     setErrors({});

        //     try {
        //         const d = res.data || res;

        //         // Actualizar record con TODOS los campos del detalle
        //         setRecord(prev => ({
        //             ...prev,
        //             accountName:      d.accountName      ?? prev.accountName,
        //             branchName:       d.branchName       ?? prev.branchName      ?? '',
        //             bankBranchId:     d.bankBranchId     ?? prev.bankBranchId    ?? '',
        //             accountExecutive: d.accountExecutive ?? prev.accountExecutive ?? '',
        //             bankPhone:        d.bankPhone        ?? prev.bankPhone        ?? '',
        //             description:      d.description      ?? prev.description      ?? '',
        //             allowsOverdraft:  d.allowsOverdraft  ?? false,
        //             creditLimit:      d.creditLimit      ?? 0,
        //             notifyLowBalance: d.notifyLowBalance ?? false,
        //             minimumBalance:   d.minimumBalance   ?? 0,
        //             costCenterId:     d.costCenterId     ?? prev.costCenterId    ?? '',
        //             changeReason:     '',
        //         }));
        //         console.log(d.bankBranch, 'd.bankBranch');
        //         setBranches(d.bankBranch ? [d.bankBranch] : []);

        //     } catch (err) {
        //         console.error('Error cargando detalle para editar:', err);
        //         setError({ message: 'No se pudo cargar el detalle de la cuenta.', type: 'danger', show: true });
        //     } finally {
        //         setLoadingDetail(false);
        //     }
        // };

        // const onHide = () => {
        //     setErrors({});
        //     setError({ message: '', type: '', show: false });
        //     setBranches([]);
        // };

        // el.addEventListener('show.bs.modal',   onShow);
        // el.addEventListener('hidden.bs.modal', onHide);
        // return () => {
        //     el.removeEventListener('show.bs.modal',   onShow);
        //     el.removeEventListener('hidden.bs.modal', onHide);
        // };
    }, [modalRef, record.id]);

    useEffect(() => {
        if (!record.bank) return;
        const branches = banks.find(b => b.id === record.bank.id)?.branches.map(b => ({ id: b.id, label: b.name || b.label || b.address }));
        console.log(branches, 'branches');  
        setBranches(branches);
    }, [record.bank, banks]);

    // ── Guardar cambios ───────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            const body = {
                accountName:      record.accountName,
                branchName:       record.branchName       || '',
                accountExecutive: record.accountExecutive || '',
                bankPhone:        record.bankPhone        || '',
                description:      record.description      || '',
                allowsOverdraft:  record.allowsOverdraft  || false,
                creditLimit:      Number(record.creditLimit)    || 0,
                notifyLowBalance: record.notifyLowBalance  || false,
                minimumBalance:   Number(record.minimumBalance) || 0,
                costCenterId:     Number(record.costCenterId)   || 0,
                changeReason:     record.changeReason,
            };

            await fetchHelper.put(base_url(['api', 'v1', 'bank-accounts', record.id]), body, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setMessage({ message: 'Cuenta bancaria actualizada correctamente.', type: 'success', show: true });

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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-edit-line me-2"></i>Editar Cuenta Bancaria
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

                        {loadingDetail ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Cargando...</span>
                                </div>
                                <p className="mt-2 text-muted">Cargando datos de la cuenta...</p>
                            </div>
                        ) : (
                            <>
                                {/* ── Campos de solo lectura ──────────────── */}
                                {record.used && (
                                    <div className="alert alert-info py-2 mb-4">
                                        <i className="ri-information-line me-1"></i>
                                        El código, número de cuenta, moneda y cuenta contable <strong>no pueden modificarse</strong> si existen movimientos registrados.
                                    </div>
                                )}

                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-file-list-3-line me-1"></i>Información de referencia
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_code" label="Código"
                                            value={record.code} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputModal type="text" id="upd_code" label="Código"
                                                value={record.code} onChange={e => field('code', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_accountNumberMasked" label="N° Cuenta"
                                            value={record.accountNumberMasked} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputModal type="text" id="upd_accountNumberMasked" label="N° Cuenta"
                                                value={record.accountNumberMasked} onChange={e => field('accountNumberMasked', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_bankName" label="Banco"
                                            value={record.bankName} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputSelectModal
                                                id="upd_bankId" label="Banco"
                                                value={record?.bank?.id ?? ''}
                                                onChange={v => field('bankId', v)}
                                                options={banks.map(b => ({ id: b.id, label: b.name || b.label }))}
                                                error={errors.bankId}
                                                required={true}

                                            />
                                            // <InputModal type="text" id="upd_bankName" label="Banco"
                                            //     value={record.bankName} onChange={e => field('bankName', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_currencyCode" label="Moneda"
                                            value={record.currencyCode} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputSelectModal
                                                id="upd_currencyTypeId" label="Moneda"
                                                value={record?.currency?.id ?? ''}
                                                onChange={v => field('currencyTypeId', v)}
                                                options={currencyTypes.map(c => ({ id: c.id, label: c.name || c.label }))}
                                                error={errors.currencyTypeId}
                                                required={true}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* ── Campos editables ────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-edit-2-line me-1"></i>Datos editables
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-4">
                                        <InputModal
                                            type="text" id="upd_accountName" label="Nombre de cuenta"
                                            value={record.accountName}
                                            onChange={e => field('accountName', e.target.value)}
                                            error={errors.accountName} required
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        <InputSelectModal
                                            id="upd_costCenterId" label="Centro de costo"
                                            value={record.costCenterId}
                                            onChange={v => field('costCenterId', v)}
                                            options={costCenters}
                                            clearable
                                        />
                                    </div>
                                </div>

                                {/* ── Sucursal ────────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-map-pin-line me-1"></i>Sucursal y contacto
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-4 mb-4">
                                        <InputSelectModal
                                            id="upd_bankBranchId" label="Sucursal"
                                            value={record?.bankBranch?.id ?? ''}
                                            onChange={v => {
                                                field('bankBranchId', v);
                                            }}
                                            options={branches}
                                            error={errors.bankBranchId}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-4">
                                        <InputModal
                                            type="text" id="upd_accountExecutive" label="Ejecutivo de cuenta"
                                            placeholder="Nombre del ejecutivo"
                                            value={record.accountExecutive}
                                            onChange={e => field('accountExecutive', e.target.value)}
                                            error={errors.accountExecutive}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-4">
                                        <InputModal
                                            type="text" id="upd_bankPhone" label="Teléfono banco"
                                            placeholder="Ej: 6016543210"
                                            value={record.bankPhone}
                                            onChange={e => field('bankPhone', e.target.value)}
                                            error={errors.bankPhone}
                                        />
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-12 mb-4">
                                        <InputModal
                                            type="text" id="upd_description" label="Descripción"
                                            placeholder="Descripción de la cuenta"
                                            value={record.description}
                                            onChange={e => field('description', e.target.value)}
                                            error={errors.description}
                                        />
                                    </div>
                                </div>

                                {/* ── Configuraciones ─────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-toggle-line me-1"></i>Configuraciones
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-4 mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input className="form-check-input" type="checkbox"
                                                id="upd_allowsOverdraft"
                                                checked={!!record.allowsOverdraft}
                                                onChange={e => field('allowsOverdraft', e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="upd_allowsOverdraft">
                                                Permite sobregiro
                                            </label>
                                        </div>
                                        {record.allowsOverdraft && (
                                            <InputModal
                                                type="number" id="upd_creditLimit" label="Límite de crédito"
                                                value={record.creditLimit ?? 0}
                                                onChange={e => field('creditLimit', Number(e.target.value))}
                                                error={errors.creditLimit} min={0}
                                            />
                                        )}
                                    </div>
                                    <div className="col-md-4 mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input className="form-check-input" type="checkbox"
                                                id="upd_notifyLowBalance"
                                                checked={!!record.notifyLowBalance}
                                                onChange={e => field('notifyLowBalance', e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="upd_notifyLowBalance">
                                                Notificar saldo mínimo
                                            </label>
                                        </div>
                                        {record.notifyLowBalance && (
                                            <InputModal
                                                type="number" id="upd_minimumBalance" label="Saldo mínimo"
                                                value={record.minimumBalance ?? 0}
                                                onChange={e => field('minimumBalance', Number(e.target.value))}
                                                error={errors.minimumBalance} min={0}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* ── Auditoría ───────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-clipboard-line me-1"></i>Auditoría
                                </p>
                                <div className="row">
                                    <div className="col-md-12 mb-4">
                                        <InputModal
                                            type="text" id="upd_changeReason" label="Motivo del cambio"
                                            placeholder="Describa brevemente el motivo de la modificación (mínimo 10 caracteres)"
                                            value={record.changeReason}
                                            onChange={e => field('changeReason', e.target.value)}
                                            error={errors.changeReason} required
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={loadingDetail}>
                            <i className="ri-save-line me-1"></i>Guardar cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateBankAccount;
