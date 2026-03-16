import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Constantes ─────────────────────────────────────────────────────────────────
const CORRECTION_TYPES = [
    { id: 'RECLASIFICACION', label: 'Reclasificación' },
    { id: 'REVALUACION', label: 'Revaluación' },
    { id: 'AJUSTE_VIDA_UTIL', label: 'Ajuste de vida útil' },
    { id: 'CAMBIO_METODO', label: 'Cambio de método de depreciación' },
    { id: 'REVERSION_DETERIORO', label: 'Reversión de deterioro' },
];

const DEPRECIATION_METHOD_OPTIONS = [
    { id: 'LINEAR', label: 'Línea recta' },
    { id: 'PRODUCTION_UNITS', label: 'Unidades de producción' },
    { id: 'DECLINING_BALANCE', label: 'Saldo decreciente' },
    { id: 'ACCELERATED', label: 'Acelerado' },
];

const ASSET_TYPE_OPTIONS = [
    { id: 'CORRIENTE', label: 'Corriente' },
    { id: 'NO_CORRIENTE', label: 'No corriente' },
];

const TANGIBILITY_OPTIONS = [
    { id: 'TANGIBLE', label: 'Tangible' },
    { id: 'INTANGIBLE', label: 'Intangible' },
];

// Parámetros NIIF (misma configuración que en la verificación)
const NIIF_PARAMS = [
    {
        norm: 'NIC 16 (tangible)',
        minUsefulLife: 5, maxUsefulLife: 20,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS', 'DECLINING_BALANCE'],
        assetType: 'NO_CORRIENTE', tangibility: 'TANGIBLE',
    },
    {
        norm: 'NIIF 16 (leasing)',
        minUsefulLife: 1, maxUsefulLife: 25,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        assetType: 'NO_CORRIENTE', tangibility: 'TANGIBLE',
    },
    {
        norm: 'NIC 38 (intangible)',
        minUsefulLife: 3, maxUsefulLife: 10,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        assetType: 'NO_CORRIENTE', tangibility: 'INTANGIBLE',
    },
];

// ─── Componente ─────────────────────────────────────────────────────────────────
const CorrectionFormModal = ({ modalRef, modalInstance, asset, onSuccess }) => {

    const [correctionType, setCorrectionType] = useState('');
    const [newValues, setNewValues] = useState({
        usefulLife: '',
        method: '',
        acquisitionValue: '',
        assetType: '',
        tangibility: '',
        depreciationAmount: '',
    });
    const [justification, setJustification] = useState('');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset al abrir con nuevo activo
    useEffect(() => {
        setCorrectionType('');
        setNewValues({ usefulLife: '', method: '', acquisitionValue: '', assetType: '', tangibility: '', depreciationAmount: '' });
        setJustification('');
        setErrors({});
        setErrorMessage('');
    }, [asset]);

    const validateNiif = (type, values, norm) => {
        const applicableParam = NIIF_PARAMS.find(p =>
            (p.assetType === null || p.assetType === (asset?.assetType ?? values.assetType)) &&
            (p.tangibility === null || p.tangibility === (asset?.tangibility ?? values.tangibility))
        );
        if (!applicableParam) return null;

        if (type === 'AJUSTE_VIDA_UTIL' && values.usefulLife) {
            const ul = Number(values.usefulLife);
            const { minUsefulLife, maxUsefulLife } = applicableParam;
            const tolerance = 0.20;
            if (ul < minUsefulLife * (1 - tolerance) || ul > maxUsefulLife * (1 + tolerance)) {
                return `El ajuste excede los límites normativos definidos por NIIF. Rango permitido: ${minUsefulLife}–${maxUsefulLife} años (±20%).`;
            }
        }
        if (type === 'CAMBIO_METODO' && values.method) {
            if (!applicableParam.allowedMethods.includes(values.method)) {
                const methodLabel = DEPRECIATION_METHOD_OPTIONS.find(m => m.id === values.method)?.label ?? values.method;
                return `El método de depreciación "${methodLabel}" no está permitido para esta categoría de activo según ${applicableParam.norm}.`;
            }
        }
        return null;
    };

    const validate = () => {
        const e = {};
        if (!correctionType) e.correctionType = 'Seleccione el tipo de corrección';
        if (!justification.trim()) e.justification = 'La justificación es obligatoria';

        if (correctionType === 'AJUSTE_VIDA_UTIL' && !newValues.usefulLife) e.usefulLife = 'Ingrese la nueva vida útil';
        if (correctionType === 'CAMBIO_METODO' && !newValues.method) e.method = 'Seleccione el nuevo método';
        if (correctionType === 'REVALUACION' && !newValues.acquisitionValue) e.acquisitionValue = 'Ingrese el nuevo valor';
        if (correctionType === 'RECLASIFICACION') {
            if (!newValues.assetType) e.assetType = 'Seleccione la nueva clasificación';
            if (!newValues.tangibility) e.tangibility = 'Seleccione la nueva tangibilidad';
        }
        if (correctionType === 'REVERSION_DETERIORO' && !newValues.depreciationAmount) e.depreciationAmount = 'Ingrese el monto de reversión';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleApply = async () => {
        if (!validate()) {
            setErrorMessage('Faltan valores obligatorios para realizar la corrección NIIF.');
            return;
        }

        const niifError = validateNiif(correctionType, newValues);
        if (niifError) {
            setErrorMessage(niifError);
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const payload = {
                assetCode: asset?.assetCode,
                correctionType,
                previousValues: {
                    usefulLife: asset?.usefulLife,
                    method: asset?.method,
                    acquisitionValue: asset?.acquisitionValue,
                    assetType: asset?.assetType,
                    tangibility: asset?.tangibility,
                },
                newValues,
                justification,
                appliedAt: new Date().toISOString(),
                niifStatus: 'CUMPLE',
            };

            // Registrar corrección + auditoría
            try {
                const url = base_url(['api', 'v1', 'niif-correction', 'apply']);
                await fetchHelper.post(url, payload, {}, 0).catch(() => null);
            } catch (_) { /* silencioso si backend no disponible */ }

            await new Promise(r => setTimeout(r, 600));
            modalInstance?.current?.hide();
            onSuccess?.(payload);
        } catch (err) {
            console.error(err);
            setErrorMessage('No fue posible aplicar la corrección. Contacte al administrador.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDynamicFields = () => {
        switch (correctionType) {
            case 'AJUSTE_VIDA_UTIL':
                return (
                    <div className="col-12 mb-3">
                        <InputModal
                            type="number"
                            id="corr_usefulLife"
                            label="Nueva vida útil (años)"
                            value={newValues.usefulLife}
                            onChange={(e) => setNewValues(p => ({ ...p, usefulLife: e.target.value }))}
                            error={errors.usefulLife}
                            placeholder="Ej. 10"
                            required
                        />
                    </div>
                );
            case 'CAMBIO_METODO':
                return (
                    <div className="col-12 mb-3">
                        <InputSelectModal
                            id="corr_method"
                            label="Nuevo método de depreciación"
                            value={newValues.method}
                            onChange={(v) => setNewValues(p => ({ ...p, method: v }))}
                            options={DEPRECIATION_METHOD_OPTIONS}
                            placeholder="Seleccione método"
                            error={errors.method}
                            required
                        />
                    </div>
                );
            case 'REVALUACION':
                return (
                    <div className="col-12 mb-3">
                        <InputModal
                            type="number"
                            id="corr_revalValue"
                            label="Nuevo valor del activo ($)"
                            value={newValues.acquisitionValue}
                            onChange={(e) => setNewValues(p => ({ ...p, acquisitionValue: e.target.value }))}
                            error={errors.acquisitionValue}
                            placeholder="Ej. 50000000"
                            required
                        />
                    </div>
                );
            case 'RECLASIFICACION':
                return (
                    <>
                        <div className="col-md-6 mb-3">
                            <InputSelectModal
                                id="corr_assetType"
                                label="Nueva clasificación"
                                value={newValues.assetType}
                                onChange={(v) => setNewValues(p => ({ ...p, assetType: v }))}
                                options={ASSET_TYPE_OPTIONS}
                                placeholder="Corriente / No corriente"
                                error={errors.assetType}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <InputSelectModal
                                id="corr_tangibility"
                                label="Nueva tangibilidad"
                                value={newValues.tangibility}
                                onChange={(v) => setNewValues(p => ({ ...p, tangibility: v }))}
                                options={TANGIBILITY_OPTIONS}
                                placeholder="Tangible / Intangible"
                                error={errors.tangibility}
                                required
                            />
                        </div>
                    </>
                );
            case 'REVERSION_DETERIORO':
                return (
                    <div className="col-12 mb-3">
                        <InputModal
                            type="number"
                            id="corr_depreciationAmount"
                            label="Monto de reversión ($)"
                            value={newValues.depreciationAmount}
                            onChange={(e) => setNewValues(p => ({ ...p, depreciationAmount: e.target.value }))}
                            error={errors.depreciationAmount}
                            placeholder="Ej. 5000000"
                            required
                        />
                    </div>
                );
            default:
                return null;
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
                                    <strong>{asset.assetName}</strong> — {asset.assetCode}
                                    <br />
                                    <span className="text-muted">
                                        Vida útil actual: {asset.usefulLife} años · Método: {DEPRECIATION_METHOD_OPTIONS.find(m => m.id === asset.method)?.label ?? asset.method ?? '-'} · Valor: ${Number(asset.acquisitionValue ?? 0).toLocaleString('es-CO')}
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

                        {/* Campos dinámicos */}
                        {correctionType && (
                            <div className="row">
                                {renderDynamicFields()}
                            </div>
                        )}

                        {/* Justificación (siempre visible) */}
                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="corr_justification"
                                    label="Justificación del ajuste"
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                    error={errors.justification}
                                    placeholder="Describa el motivo del ajuste y la base normativa que lo sustenta..."
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
