import { useState, useEffect } from 'react';

import AlertPage     from '../../../components/molecules/AlertPage';
import InputModal    from '../../../components/molecules/InputModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// TODO: confirmar ruta del endpoint con backend
const ANULAR_URL = (id) => ['api', 'v1', 'cash-and-banks', 'cheques', id, 'anular'];

const MIN_MOTIVO = 40;

const AnnulCheque = ({
    modalRef, modalInstance, record, setRecord, dataTableRef, setMessage,
}) => {

    const [motivo,       setMotivo]       = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading,      setLoading]      = useState(false);

    useEffect(() => {
        setMotivo('');
        setErrorMessage('');
    }, [record]);

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    const handleSubmit = async () => {
        if (!motivo || motivo.trim().length < MIN_MOTIVO) {
            setErrorMessage(`El motivo de anulación debe tener al menos ${MIN_MOTIVO} caracteres`);
            return;
        }

        // Doble confirmación — operación crítica
        const confirm = await window.Swal.fire({
            title: '¿Confirmar anulación?',
            html: `¿Está seguro de anular el cheque <strong>N° ${record.numeroCheque}</strong> por valor de <strong>${formatCurrency(record.valorCheque)}</strong>?<br/><br/><em>Esta acción no se puede deshacer.</em>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, anular',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        });

        if (!confirm.isConfirmed) return;

        try {
            setLoading(true);
            const url = base_url(ANULAR_URL(record.id));
            await fetchHelper.put(url, { motivoAnulacion: motivo.trim() }, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();

            setMessage({
                message: `Cheque N° ${record.numeroCheque} anulado exitosamente`,
                type: 'success',
                show: true,
            });

            setMotivo('');
            setErrorMessage('');
        } catch (error) {
            console.error(error);
            setErrorMessage(error?.msg || 'Error al anular el cheque, intente nuevamente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalAnnulCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Anular Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

                        {/* Datos del cheque (solo lectura) */}
                        <div className="alert alert-warning mb-4" role="alert">
                            <i className="ri-error-warning-line me-2"></i>
                            Esta operación cambiará el estado del cheque a <strong>ANULADO</strong> y actualizará los contadores de la chequera.
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="annul_numero"
                                    label="Número de cheque"
                                    value={record.numeroCheque}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="annul_valor"
                                    label="Valor"
                                    value={formatCurrency(record.valorCheque)}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="annul_beneficiario"
                                    label="Beneficiario"
                                    value={record.beneficiario}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Motivo de anulación */}
                        <div className="row">
                            <TextareaModal
                                id="annul_motivo"
                                label="Motivo de anulación"
                                placeholder={`Ingrese el motivo (mínimo ${MIN_MOTIVO} caracteres)`}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                error=""
                                required
                            />
                        </div>
                        <small className="text-muted d-block mb-2">
                            {motivo.trim().length} / {MIN_MOTIVO} caracteres mínimos
                        </small>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-danger ms-auto"
                            onClick={handleSubmit}
                            disabled={loading}>
                            {loading ? 'Anulando...' : 'Anular Cheque'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnulCheque;
