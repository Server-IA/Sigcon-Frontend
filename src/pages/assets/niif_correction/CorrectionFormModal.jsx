import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Enum exacto del backend NiifCorrectionType ──────────────────────────────
const CORRECTION_TYPES = [
    { id: 'USEFUL_LIFE_ADJUSTMENT',     label: 'Ajuste de vida útil' },
    { id: 'REVALUATION',                label: 'Revaluación' },
    { id: 'DEPRECIATION_METHOD_CHANGE', label: 'Cambio de método de depreciación' },
];

// ─── Componente ─────────────────────────────────────────────────────────────────
const CorrectionFormModal = ({ modalRef, modalInstance, asset, onSuccess }) => {

    const [correctionType,       setCorrectionType]       = useState('');
    const [newUsefulLifeMonths,  setNewUsefulLifeMonths]  = useState('');
    const [newBookValue,         setNewBookValue]         = useState('');
    const [observations,         setObservations]         = useState('');
    const [errors,               setErrors]               = useState({});
    const [errorMessage,         setErrorMessage]         = useState('');
    const [isSubmitting,         setIsSubmitting]         = useState(false);

    // Reset al abrir con nuevo activo
    useEffect(() => {
        setCorrectionType('');
        setNewUsefulLifeMonths('');
        setNewBookValue('');
        setObservations('');
        setErrors({});
        setErrorMessage('');
    }, [asset]);

    const validate = () => {
        const e = {};
        if (!correctionType) e.correctionType = 'Seleccione el tipo de corrección';
        if (correctionType === 'USEFUL_LIFE_ADJUSTMENT' && (!newUsefulLifeMonths || Number(newUsefulLifeMonths) <= 0))
            e.newUsefulLifeMonths = 'Ingrese la nueva vida útil en meses';
        if (correctionType === 'REVALUATION' && (!newBookValue || Number(newBookValue) <= 0))
            e.newBookValue = 'Ingrese el nuevo valor en libros';
        if (!observations.trim()) e.observations = 'Las observaciones son obligatorias';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleApply = async () => {
        if (!validate()) {
            setErrorMessage('Faltan valores obligatorios para realizar la corrección NIIF.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            // POST /api/v1/niif-alerts/correction
            const payload = {
                assetId:             asset?.assetId ?? 0,
                correctionType,
                newUsefulLifeMonths: newUsefulLifeMonths ? Number(newUsefulLifeMonths) : 0,
                newBookValue:        newBookValue        ? Number(newBookValue)        : 0,
                observations,
            };

            await fetchHelper.post(
                base_url(['api', 'v1', 'niif-alerts', 'correction']),
                payload,
                {},
                10000
            );

            modalInstance?.current?.hide();
            onSuccess?.(payload);

        } catch (err) {
            console.error('Error al aplicar corrección NIIF:', err);
            const serverMsg = err?.message ?? err?.msg ?? '';
            if (err?.status === 400 || serverMsg) {
                setErrorMessage(serverMsg || 'Error en los datos enviados. Verifique los campos e intente nuevamente.');
            } else if (err?.status === 404) {
                setErrorMessage('Activo no encontrado. Verifique el ID del activo ingresado.');
            } else {
                setErrorMessage('No fue posible aplicar la corrección. Contacte al administrador.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-tools-line me-2 text-warning" />
                            Aplicar Corrección NIIF
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        {/* Info del activo */}
                        {asset && (
                            <div className="alert alert-secondary d-flex align-items-start gap-3 mb-4 py-2">
                                <i className="ri-information-line fs-5 mt-1 text-primary" />
                                <div style={{ fontSize: '0.85rem' }}>
                                    <strong>{asset.assetName}</strong> — ID: {asset.assetId ?? asset.assetCode}
                                    <br />
                                    <span className="text-muted">
                                        Vida útil actual: {asset.usefulLife ?? '-'} · Valor: ${Number(asset.acquisitionValue ?? 0).toLocaleString('es-CO')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {errorMessage && (
                            <div className="alert alert-danger alert-dismissible d-flex align-items-center gap-2 mb-3" role="alert">
                                <i className="ri-error-warning-line fs-5" />
                                <span>{errorMessage}</span>
                                <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                            </div>
                        )}

                        {/* Tipo de corrección */}
                        <div className="row">
                            <div className="col-12 mb-4">
                                <InputSelectModal
                                    id="corr_type"
                                    label="Tipo de corrección"
                                    value={correctionType}
                                    onChange={(v) => { setCorrectionType(v); setErrors({}); setErrorMessage(''); }}
                                    options={CORRECTION_TYPES}
                                    placeholder="Seleccione el tipo de corrección"
                                    error={errors.correctionType}
                                    required
                                />
                            </div>
                        </div>

                        {/* Campos dinámicos según tipo */}
                        {correctionType === 'USEFUL_LIFE_ADJUSTMENT' && (
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <InputModal
                                        type="number"
                                        id="corr_usefulLifeMonths"
                                        label="Nueva vida útil (meses)"
                                        value={newUsefulLifeMonths}
                                        onChange={(e) => setNewUsefulLifeMonths(e.target.value)}
                                        error={errors.newUsefulLifeMonths}
                                        placeholder="Ej. 60"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {correctionType === 'REVALUATION' && (
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <InputModal
                                        type="number"
                                        id="corr_bookValue"
                                        label="Nuevo valor en libros ($)"
                                        value={newBookValue}
                                        onChange={(e) => setNewBookValue(e.target.value)}
                                        error={errors.newBookValue}
                                        placeholder="Ej. 50000000"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Observaciones (siempre visible) */}
                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="corr_observations"
                                    label="Observaciones / Justificación"
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    error={errors.observations}
                                    placeholder="Describa el motivo del ajuste y la norma NIIF aplicable..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-warning"
                            onClick={handleApply}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Aplicando...</>
                            ) : (
                                <><i className="ri-check-line me-1" />Aplicar Corrección</>
                            )}
                        </button>
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CorrectionFormModal;
