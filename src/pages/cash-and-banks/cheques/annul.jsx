import { useState, useEffect } from 'react';

import AlertPage     from '../../../components/molecules/AlertPage';
import InputModal    from '../../../components/molecules/InputModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { validateText } from '../../../utils/fieldValidations';

const ANULAR_URL = (id) => ['api', 'v1', 'banks', 'checks', id, 'void'];

const MIN_MOTIVO = 40;
const MAX_MOTIVO = 500;

const AnnulCheque = ({
    modalRef, modalInstance, record, dataTableRef, setMessage, onReportLost,
}) => {

    const [step,         setStep]         = useState(1);
    const [motivo,       setMotivo]       = useState('');
    const [password,     setPassword]     = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading,      setLoading]      = useState(false);

    // Resetear al abrir el modal
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;
        const onShow = () => {
            setStep(1);
            setMotivo('');
            setPassword('');
            setErrorMessage('');
        };
        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef]);

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    // Etapa 1 → 2
    // QA BNK (2026-06-03) BNK-RF-19: motivo min 40 / max 500 + clase de caracteres.
    const handleContinue = () => {
        const motivoErr = validateText(motivo, {
            required: true, min: MIN_MOTIVO, max: MAX_MOTIVO,
            patternKey: 'description', label: 'El motivo de anulación',
        });
        if (motivoErr) {
            setErrorMessage(motivoErr);
            return;
        }
        setErrorMessage('');
        setStep(2);
    };

    // Etapa 2: confirmar anulación
    const handleSubmit = async () => {
        if (!password || !password.trim()) {
            setErrorMessage('Debe ingresar su contraseña para confirmar la anulación');
            return;
        }

        try {
            setLoading(true);
            const url = base_url(ANULAR_URL(record.id));
            await fetchHelper.put(url, { voidReason: motivo.trim(), currentPassword: password }, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({
                message: `Cheque N° ${record.numeroCheque} anulado exitosamente`,
                type: 'success',
                show: true,
            });
        } catch (error) {
            setErrorMessage(error?.msg || 'Error al anular el cheque, intente nuevamente');
        } finally {
            setLoading(false);
        }
    };

    // Botón "Reportar extravío": cierra este modal y abre el de extravío
    const handleReportLost = () => {
        modalInstance?.current?.hide();
        onReportLost?.();
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalAnnulCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                <div className="modal-content">

                    {/* ── ETAPA 1: Motivo de anulación ── */}
                    {step === 1 && (
                        <>
                            <div className="modal-header">
                                <h4 className="modal-title">Anular Cheque</h4>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                            </div>

                            <div className="modal-body">
                                <AlertPage
                                    message={errorMessage}
                                    type="danger"
                                    show={!!errorMessage}
                                    onChange={() => setErrorMessage('')}
                                />

                                <div className="alert alert-warning mb-4" role="alert">
                                    <i className="ri-error-warning-line me-2" />
                                    Esta operación cambiará el estado del cheque a <strong>ANULADO</strong> y actualizará los contadores de la chequera.
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="annul_numero"
                                            label="Número de cheque"
                                            value={record.numeroCheque}
                                            onChange={() => {}}
                                            readOnly
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="annul_valor"
                                            label="Valor"
                                            value={formatCurrency(record.valorCheque)}
                                            onChange={() => {}}
                                            readOnly
                                        />
                                    </div>
                                    <div className="col-12">
                                        <InputModal
                                            type="text"
                                            id="annul_beneficiario"
                                            label="Beneficiario"
                                            value={record.beneficiario}
                                            onChange={() => {}}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <TextareaModal
                                    id="annul_motivo"
                                    label="Motivo de anulación"
                                    placeholder={`Ingrese el motivo (entre ${MIN_MOTIVO} y ${MAX_MOTIVO} caracteres)`}
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    error=""
                                    maxLength={MAX_MOTIVO}
                                    rows={4}
                                    required
                                />
                                <small className={`d-block mt-1 mb-2 text-${motivo.trim().length >= MIN_MOTIVO ? 'success' : 'muted'}`}>
                                    {motivo.trim().length} / {MIN_MOTIVO} caracteres mínimos
                                </small>
                            </div>

                            <div className="modal-footer d-flex justify-content-between flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="btn btn-warning waves-effect"
                                    onClick={handleReportLost}
                                >
                                    <i className="ri-alert-line me-1" />Reportar extravío
                                </button>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-danger waves-effect"
                                        onClick={handleContinue}
                                    >
                                        Continuar con anulación
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary waves-effect"
                                        data-bs-dismiss="modal"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── ETAPA 2: Confirmación con contraseña ── */}
                    {step === 2 && (
                        <>
                            <div className="modal-header">
                                <h4 className="modal-title">Confirmar Anulación</h4>
                            </div>

                            <div className="modal-body">
                                <AlertPage
                                    message={errorMessage}
                                    type="danger"
                                    show={!!errorMessage}
                                    onChange={() => setErrorMessage('')}
                                />

                                <div className="alert alert-danger mb-4" role="alert">
                                    <i className="ri-close-circle-line me-2" />
                                    Está a punto de anular el cheque <strong>N° {record.numeroCheque}</strong> por valor de <strong>{formatCurrency(record.valorCheque)}</strong>. Esta acción <strong>no se puede deshacer</strong>.
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-muted">Motivo registrado</label>
                                    <p className="border rounded p-2 bg-light small">{motivo}</p>
                                </div>

                                <InputModal
                                    type="password"
                                    id="annul_password"
                                    label="Contraseña de confirmación"
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="modal-footer d-flex justify-content-between">
                                <button
                                    type="button"
                                    className="btn btn-secondary waves-effect"
                                    onClick={() => { setStep(1); setErrorMessage(''); setPassword(''); }}
                                    disabled={loading}
                                >
                                    <i className="ri-arrow-left-line me-1" />Volver
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger waves-effect waves-light"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <><span className="spinner-border spinner-border-sm me-1" role="status" />Anulando...</>
                                        : 'Confirmar Anulación'
                                    }
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AnnulCheque;
