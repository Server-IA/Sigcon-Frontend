import { useState, useEffect, useMemo, useId } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const JUSTIFICATION_MIN_LENGTH = 50;

/**
 * Modos de uso:
 *  - Standalone (desde la tabla): NO pasar `onAdjustSave` → hace PUT a la API.
 *  - Inline (dentro de create/updated): Pasar `onAdjustSave` → solo llama al callback.
 */
const AdjustSegmentation = ({
    modalRef,
    modalInstance,
    client,
    dataTableRef,
    setMessage,
    segments,
    onAdjustSave,
    onBack,
}) => {

    const uid = useId();

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

    const handleClear = () => {
        setAdjustment({ segment: '', justification: '' });
        setErrors({});
        setErrorMessage('');
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        setErrors({});

        if (!adjustment.segment) {
            setErrors(prev => ({ ...prev, segment: 'Debe seleccionar el nuevo segmento' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }

        // ECL_002
        if (!adjustment.justification || adjustment.justification.trim().length < JUSTIFICATION_MIN_LENGTH) {
            setErrors(prev => ({
                ...prev,
                justification: `La justificación debe tener al menos ${JUSTIFICATION_MIN_LENGTH} caracteres`,
            }));
            setErrorMessage(`ECL_002: Justificación insuficiente (mínimo ${JUSTIFICATION_MIN_LENGTH} caracteres).`);
            return;
        }

        const payload = {
            segment:       adjustment.segment,
            justification: adjustment.justification.trim(),
        };

        // Modo inline: devolver al padre sin llamada API
        if (typeof onAdjustSave === 'function') {
            onAdjustSave(payload);
            return;
        }

        // Modo standalone: llamada API directa
        try {
            setLoading(true);
            const url = base_url(['api', 'v1', 'third-parties', client.id, 'roles-status']);
            await fetchHelper.put(url, payload, {}, 1000);
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({ message: 'Segmento actualizado exitosamente', type: 'success', show: true });
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

    const segmentOptions = useMemo(() => segments.filter(s => s.id !== 'PENDING'), [segments]);

    return (
        <div
            className="modal fade"
            ref={modalRef}
            id={`modalAdjustSegmentation${uid}`}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">Ajuste manual</h4>
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row g-3">

                            {/* Segmento actual (solo lectura) */}
                            <div className="col-md-6">
                                <InputModal
                                    type="text"
                                    id={`adj_autoSegment${uid}`}
                                    label="Segmento actual (automatico)"
                                    value={segmentLabel(client?.autoSegment)}
                                    readOnly
                                    required
                                />
                            </div>

                            {/* Nuevo segmento (manual) */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id={`adj_newSegment${uid}`}
                                    label="Nuevo segmento (manual)"
                                    value={adjustment.segment}
                                    onChange={(val) => setAdjustment(prev => ({ ...prev, segment: val }))}
                                    options={segmentOptions}
                                    error={errors.segment}
                                    required
                                />
                            </div>

                            {/* Justificación */}
                            <div className="col-12">
                                <TextareaModal
                                    id={`adj_justification${uid}`}
                                    label={`Justificación (min ${JUSTIFICATION_MIN_LENGTH} caracteres)`}
                                    value={adjustment.justification}
                                    onChange={(e) => setAdjustment(prev => ({ ...prev, justification: e.target.value }))}
                                    placeholder="Justifica"
                                    error={errors.justification}
                                    required
                                />
                                <small className={`text-${adjustment.justification.trim().length >= JUSTIFICATION_MIN_LENGTH ? 'success' : 'muted'}`}>
                                    {adjustment.justification.trim().length} / {JUSTIFICATION_MIN_LENGTH} caracteres mínimos
                                </small>
                            </div>

                        </div>

                    </div>

                    <div className="modal-footer d-flex justify-content-between">
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-primary waves-effect waves-light"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Guardando...</>
                                    : 'Guardar'
                                }
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary waves-effect"
                                onClick={handleClear}
                                disabled={loading}
                            >
                                Limpiar
                            </button>
                        </div>
                        <button
                            type="button"
                            className="btn btn-danger waves-effect"
                            disabled={loading}
                            onClick={() => {
                                modalInstance?.current?.hide();
                                if (typeof onBack === 'function') {
                                    setTimeout(() => onBack(), 350);
                                }
                            }}
                        >
                            Volver
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdjustSegmentation;
