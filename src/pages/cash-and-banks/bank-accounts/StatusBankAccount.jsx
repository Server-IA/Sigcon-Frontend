import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import InputDate from '../../../components/molecules/InputDate';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const STATUS_OPTIONS = [
    { id: 'ACTIVA',     label: 'Activa' },
    { id: 'INACTIVA',   label: 'Inactiva' },
    { id: 'SUSPENDIDA', label: 'Suspendida' },
    { id: 'CERRADA',    label: 'Cerrada (irreversible)' },
];

const REQUIRES_MOTIVO  = ['INACTIVA', 'SUSPENDIDA', 'CERRADA'];
const REQUIRES_CLOSING = ['CERRADA'];

const StatusBankAccount = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    statusLabels,
}) => {
    const [status,      setStatus]      = useState('');
    const [motivo,      setMotivo]      = useState('');
    const [closingDate, setClosingDate] = useState('');
    const [errors,      setErrors]      = useState({});
    const [error,       setError]       = useState({ message: '', type: '', show: false });

    // Resetear campos al actual al abrir
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        const onShow = () => {
            setStatus(record.status || '');
            setMotivo('');
            setClosingDate('');
            setErrors({});
            setError({ message: '', type: '', show: false });
        };

        const onHide = () => {
            setErrors({});
            setError({ message: '', type: '', show: false });
        };

        el.addEventListener('show.bs.modal',   onShow);
        el.addEventListener('hidden.bs.modal', onHide);
        return () => {
            el.removeEventListener('show.bs.modal',   onShow);
            el.removeEventListener('hidden.bs.modal', onHide);
        };
    }, [modalRef, record.status]);

    const handleSave = async () => {
        const newErrors = {};

        if (!status)
            newErrors.status = 'Debe seleccionar un estado.';

        if (REQUIRES_MOTIVO.includes(status) && !motivo.trim())
            newErrors.motivo = 'El motivo es obligatorio para este estado.';

        if (REQUIRES_CLOSING.includes(status) && !closingDate)
            newErrors.closingDate = 'La fecha de cierre es requerida.';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            const body = { status, motivo: motivo || null, closingDate: closingDate || null };

            await fetchHelper.put(
                base_url(['api', 'v1', 'bank-accounts', record.id, 'status']),
                body, {}, 1000
            );

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setMessage({
                message: `Estado de la cuenta cambiado a "${statusLabels[status] || status}" correctamente.`,
                type: 'success',
                show: true,
            });

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

    const isClosed = REQUIRES_CLOSING.includes(status);

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-refresh-line me-2"></i>Cambiar Estado
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

                        {/* Info de la cuenta */}
                        <div className="bg-lighter rounded p-3 mb-4">
                            <small className="text-muted d-block">Cuenta</small>
                            <strong>{record.accountName}</strong>
                            <span className="text-muted ms-2">({record.code})</span>
                            <div className="mt-1">
                                <small className="text-muted">Estado actual: </small>
                                <span className="fw-semibold">{statusLabels[record.status] || record.status}</span>
                            </div>
                        </div>

                        {/* Advertencia CERRADA */}
                        {isClosed && (
                            <div className="alert alert-danger py-2 mb-3">
                                <i className="ri-error-warning-line me-1"></i>
                                <strong>Atención:</strong> El estado <em>Cerrada</em> es <strong>irreversible</strong>. No podrá reactivar esta cuenta.
                            </div>
                        )}

                        {/* Selector de estado */}
                        <div className="mb-4">
                            <InputSelectModal
                                id="sts_status" label="Nuevo estado"
                                value={status}
                                onChange={v => { setStatus(v); setErrors(prev => ({ ...prev, status: null })); }}
                                options={STATUS_OPTIONS}
                                error={errors.status} required
                            />
                        </div>

                        {/* Motivo (condicional) */}
                        {REQUIRES_MOTIVO.includes(status) && (
                            <div className="mb-4">
                                <InputModal
                                    type="text" id="sts_motivo" label="Motivo"
                                    placeholder="Ingrese el motivo del cambio de estado"
                                    value={motivo}
                                    onChange={e => { setMotivo(e.target.value); setErrors(prev => ({ ...prev, motivo: null })); }}
                                    error={errors.motivo} required
                                />
                            </div>
                        )}

                        {/* Fecha de cierre (solo para CERRADA) */}
                        {isClosed && (
                            <div className="mb-4">
                                <InputDate
                                    id="sts_closingDate" label="Fecha de cierre"
                                    date={closingDate}
                                    dateFormat="Y-m-d"
                                    onChange={date => { setClosingDate(date); setErrors(prev => ({ ...prev, closingDate: null })); }}
                                    error={errors.closingDate}
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button
                            className={`btn ${isClosed ? 'btn-danger' : 'btn-primary'}`}
                            onClick={handleSave}
                        >
                            <i className="ri-check-line me-1"></i>Confirmar cambio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusBankAccount;
