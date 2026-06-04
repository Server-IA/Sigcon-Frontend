import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { validateText } from '../../../utils/fieldValidations';

const DeleteBankAccount = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
}) => {
    const [motivo,    setMotivo]    = useState('');
    const [errors,    setErrors]    = useState({});
    const [error,     setError]     = useState({ message: '', type: '', show: false });

    // Limpiar al cerrar
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;
        const reset = () => { setError({ message: '', type: '', show: false }); setErrors({}); setMotivo(''); };
        el.addEventListener('hidden.bs.modal', reset);
        return () => el.removeEventListener('hidden.bs.modal', reset);
    }, [modalRef]);

    const handleDelete = async () => {
        // QA BNK (2026-06-03 / doc validaciones BNK-RF-03): motivo min 5 / max 300 + clase de caracteres.
        const motivoErr = validateText(motivo, { required: true, min: 5, max: 300, patternKey: 'description', label: 'El motivo de eliminación' });
        if (motivoErr) {
            setErrors({ motivo: motivoErr });
            return;
        }

        try {
            await fetchHelper.delete(
                base_url(['api', 'v1', 'bank-accounts', record.id]),
                { motivo },
                {},
                1000
            );

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMotivo('');
            setErrors({});
            setMessage({ message: 'Cuenta bancaria eliminada correctamente.', type: 'success', show: true });

        } catch (err) {
            console.error(err);
            if (err?.errors?.length) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            } else if (err?.msg) {
                // Error 400 por dependencias u otros
                setError({ message: err.msg, type: 'danger', show: true });
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header border-bottom-0 pb-0">
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div className="modal-body pt-0 text-center px-5">
                        <div className="mb-3">
                            <span className="avatar avatar-lg bg-label-danger rounded mb-3 d-inline-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                                <i className="ri-delete-bin-5-line fs-2 text-danger"></i>
                            </span>
                        </div>
                        <h4 className="mb-1">¿Eliminar cuenta bancaria?</h4>
                        <p className="text-muted mb-4">
                            Esta es una <strong>eliminación lógica</strong>. Si existen chequeras asociadas, el sistema retornará un error — en ese caso considere <em>desactivar</em> la cuenta.
                        </p>
                        <div className="text-start mb-3">
                            <div className="bg-lighter rounded p-3 mb-3">
                                <small className="text-muted d-block">Cuenta a eliminar</small>
                                <strong>{record.accountName}</strong>
                                <span className="text-muted ms-2">({record.code})</span>
                            </div>
                        </div>

                        <AlertPage
                            message={error.message}
                            type={error.type}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
                        />

                        <div className="text-start mb-3">
                            <InputModal
                                type="text"
                                id="del_motivo"
                                label="Motivo de eliminación"
                                placeholder="Ingrese el motivo (entre 5 y 300 caracteres)"
                                value={motivo}
                                maxLength={300}
                                onChange={e => setMotivo(e.target.value)}
                                error={errors.motivo}
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-footer justify-content-center gap-2 pt-0 border-top-0">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button className="btn btn-danger" onClick={handleDelete}>
                            <i className="ri-delete-bin-5-line me-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteBankAccount;
