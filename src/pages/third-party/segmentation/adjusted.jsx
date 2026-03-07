import { useState, useEffect } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const JUSTIFICATION_MIN_LENGTH = 50;

const AdjustSegmentation = ({
    modalRef,
    modalInstance,
    client,
    setClient,
    dataTableRef,
    setMessage,
    segments,
}) => {

    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors]             = useState({});
    const [loading, setLoading]           = useState(false);

    const [adjustment, setAdjustment] = useState({
        segment:       '',
        justification: '',
    });

    // Limpiar formulario al abrir el modal
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onShow = () => {
            setAdjustment({ segment: '', justification: '' });
            setErrorMessage('');
            setErrors({});
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setErrors({});

        // Validaciones frontend (RF08)
        if (!adjustment.segment) {
            setErrors(prev => ({ ...prev, segment: 'Debe seleccionar el nuevo segmento' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }

        if (!adjustment.justification || adjustment.justification.trim().length < JUSTIFICATION_MIN_LENGTH) {
            setErrors(prev => ({ ...prev, justification: `La justificación debe tener al menos ${JUSTIFICATION_MIN_LENGTH} caracteres` }));
            setErrorMessage(`ECL_002: Justificación insuficiente (mínimo ${JUSTIFICATION_MIN_LENGTH} caracteres).`);
            return;
        }

        try {
            setLoading(true);

            const url     = base_url(['api', 'v1', 'ecl', 'segmentation', client.id, 'adjust']);
            const payload = {
                segment:       adjustment.segment,
                justification: adjustment.justification.trim(),
            };

            await fetchHelper.put(url, payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({
                message: 'Segmento actualizado exitosamente',
                type:    'success',
                show:    true,
            });

        } catch (error) {
            const fieldErrors = {};
            error?.errors?.forEach(err => { fieldErrors[err.field] = err.message; });
            setErrors(fieldErrors);
            setErrorMessage(error?.msg || 'Error al actualizar el segmento');
        } finally {
            setLoading(false);
        }
    };

    const segmentLabel = (id) => segments.find(s => s.id === id)?.name ?? id ?? '-';

    return (
        <div
            className="modal fade"
            ref={modalRef}
            id="modalAdjustSegmentation"
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">Ajuste Manual de Segmento ECL</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" />
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        {/* Información del cliente (solo lectura) */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <InputModal
                                    type="text"
                                    id="ecl_clientName"
                                    label="Cliente"
                                    value={client.clientName}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-3">
                                <InputModal
                                    type="text"
                                    id="ecl_daysPastDue"
                                    label="Días mora"
                                    value={String(client.daysPastDue ?? '-')}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-3">
                                <InputModal
                                    type="text"
                                    id="ecl_autoSegment"
                                    label="Segmento automático"
                                    value={segmentLabel(client.autoSegment)}
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Nuevo segmento */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="ecl_newSegment"
                                    label="Nuevo segmento"
                                    value={adjustment.segment}
                                    onChange={(val) => setAdjustment(prev => ({ ...prev, segment: val }))}
                                    options={segments.filter(s => s.id !== 'PENDING')}
                                    error={errors.segment}
                                    required
                                />
                            </div>
                        </div>

                        {/* Justificación */}
                        <div className="row g-3">
                            <div className="col-12">
                                <TextareaModal
                                    id="ecl_justification"
                                    label={`Justificación (mínimo ${JUSTIFICATION_MIN_LENGTH} caracteres)`}
                                    value={adjustment.justification}
                                    onChange={(e) => setAdjustment(prev => ({ ...prev, justification: e.target.value }))}
                                    placeholder="Describa el motivo del ajuste manual..."
                                    error={errors.justification}
                                    required
                                />
                                <small className={`text-${adjustment.justification.trim().length >= JUSTIFICATION_MIN_LENGTH ? 'success' : 'muted'}`}>
                                    {adjustment.justification.trim().length} / {JUSTIFICATION_MIN_LENGTH} caracteres mínimos
                                </small>
                            </div>
                        </div>

                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary waves-effect"
                            data-bs-dismiss="modal"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary waves-effect waves-light"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Guardando...</>
                                : <><i className="ri-save-line me-1" /> Guardar ajuste</>
                            }
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdjustSegmentation;
