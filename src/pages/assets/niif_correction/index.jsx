import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import AlertPage from '../../../components/molecules/AlertPage';
import AssetSearch from './AssetSearch';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Enum exacto del backend NiifCorrectionType ──────────────────────────────
const CORRECTION_TYPES = [
    { id: 'USEFUL_LIFE_ADJUSTMENT',     label: 'Ajuste de vida útil' },
    { id: 'REVALUATION',                label: 'Revaluación' },
    { id: 'DEPRECIATION_METHOD_CHANGE', label: 'Cambio de método de depreciación' },
];

// ─── Componente principal ────────────────────────────────────────────────────
const NiifCorrectionIndex = () => {
    const location = useLocation();

    // ── Estado del formulario ────────────────────────────────────────
    const [selectedAsset,       setSelectedAsset]       = useState(null);  // { id, assetCode, name, description }
    const [correctionType,      setCorrectionType]      = useState('');
    const [newUsefulLifeMonths, setNewUsefulLifeMonths] = useState('');
    const [newBookValue,        setNewBookValue]        = useState('');
    const [observations,        setObservations]        = useState('');

    // ── Estado UI ────────────────────────────────────────────────────
    const [errors,       setErrors]       = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess,  setShowSuccess]  = useState(false);
    const [history,      setHistory]      = useState([]);

    // Autocompletar si viene de verificación (el result puede traer assetId)
    useEffect(() => {
        const result = location.state?.result;
        if (result) {
            if (result.assetId || result.assetCode) {
                setSelectedAsset({
                    id:          result.assetId ?? null,
                    assetCode:   result.assetCode ?? '',
                    name:        result.assetName ?? '',
                    description: '',
                });
            }
            if (result.usefulLife)
                setNewUsefulLifeMonths(String(Math.round(Number(result.usefulLife) * 12)));
            if (result.acquisitionValue)
                setNewBookValue(String(result.acquisitionValue));
        }
    }, []);

    // ── Validación ───────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!selectedAsset)
            e.asset = 'Seleccione un activo';
        if (!correctionType)
            e.correctionType = 'Seleccione el tipo de corrección';
        if (correctionType === 'USEFUL_LIFE_ADJUSTMENT' && (!newUsefulLifeMonths || Number(newUsefulLifeMonths) <= 0))
            e.newUsefulLifeMonths = 'Ingrese la nueva vida útil en meses';
        if (correctionType === 'REVALUATION' && (!newBookValue || Number(newBookValue) <= 0))
            e.newBookValue = 'Ingrese el nuevo valor en libros';
        if (!observations.trim())
            e.observations = 'Las observaciones son obligatorias';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Aplicar corrección ───────────────────────────────────────────
    const handleApply = async () => {
        if (!validate()) {
            setErrorMessage('Faltan valores obligatorios para realizar la corrección NIIF.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        setShowSuccess(false);

        try {
            // POST /api/v1/niif-alerts/correction
            const payload = {
                assetId:             Number(selectedAsset.id),
                correctionType,
                newUsefulLifeMonths: newUsefulLifeMonths ? Number(newUsefulLifeMonths) : 0,
                newBookValue:        newBookValue        ? Number(newBookValue)         : 0,
                observations,
            };

            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'niif-alerts', 'correction']),
                payload,
                {},
                10000
            );

            // Agregar al historial de sesión
            const dateStr   = new Date().toLocaleDateString('es-CO');
            const corrLabel = CORRECTION_TYPES.find(c => c.id === correctionType)?.label ?? correctionType;
            setHistory(prev => [{
                assetCode: selectedAsset.assetCode ?? selectedAsset.id,
                assetName: selectedAsset.name ?? '',
                type:      corrLabel,
                date:      dateStr,
                data:      response?.data ?? null,
            }, ...prev]);

            setShowSuccess(true);

            // Resetear formulario
            setSelectedAsset(null);
            setCorrectionType('');
            setNewUsefulLifeMonths('');
            setNewBookValue('');
            setObservations('');
            setErrors({});

        } catch (err) {
            console.error('Error al aplicar corrección NIIF:', err);
            const serverMsg = err?.message ?? err?.msg ?? '';
            if (err?.status === 400 || serverMsg) {
                setErrorMessage(serverMsg || 'Error en los datos enviados. Verifique los campos e intente nuevamente.');
            } else if (err?.status === 404) {
                setErrorMessage('Activo no encontrado. Verifique el activo seleccionado.');
            } else if (err?.status === 423) {
                setErrorMessage('No se pueden aplicar correcciones. El periodo contable está cerrado.');
            } else {
                setErrorMessage('No fue posible aplicar la corrección. Contacte al administrador.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════
                CARD PRINCIPAL — Formulario de Corrección
            ═══════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title fw-bold mb-1">Corrección para Cumplimiento de las NIIF</h5>
                        <p className="text-muted mb-4" style={{ fontSize: '0.82rem' }}>
                            Aplique ajustes contables a un activo para cumplir con normas NIIF.
                            El activo debe haber sido verificado previamente y marcado con incumplimiento.
                        </p>

                        <AlertPage
                            type="success"
                            message="Corrección aplicada exitosamente y registrada en auditoría."
                            show={showSuccess}
                            onChange={() => setShowSuccess(false)}
                        />

                        {/* ── Tipo de Corrección ── */}
                        <h6 className="fw-bold mb-3">Tipo de Corrección</h6>
                        <div className="row">
                            <div className="col-12 mb-4">
                                <InputSelectModal
                                    id="corr_type"
                                    label="Tipo de corrección"
                                    value={correctionType}
                                    onChange={(v) => { setCorrectionType(v); setErrorMessage(''); }}
                                    options={CORRECTION_TYPES}
                                    placeholder="Seleccione"
                                    error={errors.correctionType}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Búsqueda de Activo ── */}
                        <h6 className="fw-bold mb-3">Datos del Activo</h6>
                        <div className="row">
                            <div className="col-12 mb-4">
                                <AssetSearch
                                    onSelect={(asset) => {
                                        setSelectedAsset(asset);
                                        setErrors(prev => { const e = { ...prev }; delete e.asset; return e; });
                                    }}
                                    selectedAsset={selectedAsset}
                                    error={errors.asset}
                                    required
                                />
                            </div>

                            {/* Nueva vida útil — solo para USEFUL_LIFE_ADJUSTMENT */}
                            {(correctionType === 'USEFUL_LIFE_ADJUSTMENT' || correctionType === '') && (
                                <div className="col-md-6 mb-4">
                                    <InputModal
                                        type="number"
                                        id="corr_usefulLifeMonths"
                                        label="Nueva vida útil (meses)"
                                        value={newUsefulLifeMonths}
                                        onChange={(e) => setNewUsefulLifeMonths(e.target.value)}
                                        placeholder="Ej. 60"
                                        error={errors.newUsefulLifeMonths}
                                        required={correctionType === 'USEFUL_LIFE_ADJUSTMENT'}
                                    />
                                </div>
                            )}

                            {/* Nuevo valor en libros — solo para REVALUATION */}
                            {(correctionType === 'REVALUATION' || correctionType === '') && (
                                <div className="col-md-6 mb-4">
                                    <InputModal
                                        type="number"
                                        id="corr_bookValue"
                                        label="Nuevo valor en libros ($)"
                                        value={newBookValue}
                                        onChange={(e) => setNewBookValue(e.target.value)}
                                        placeholder="$"
                                        error={errors.newBookValue}
                                        required={correctionType === 'REVALUATION'}
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── Observaciones ── */}
                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="corr_observations"
                                    label="Observaciones / Justificación"
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    error={errors.observations}
                                    placeholder="Describa el motivo del ajuste y la norma NIIF aplicable"
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Error inline ── */}
                        {errorMessage && (
                            <div className="d-flex align-items-center gap-2 mb-3" style={{ color: '#d32f2f', fontSize: '0.82rem' }}>
                                <i className="ri-error-warning-line" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* ── Botones ── */}
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleApply}
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Aplicando...</>
                                    : 'Aplicar Corrección'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => { setErrorMessage(''); setErrors({}); }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                HISTORIAL DE CORRECCIONES (solo sesión actual)
            ═══════════════════════════════════════════════════════════════ */}
            {history.length > 0 && (
                <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                        <h5 className="fw-bold mb-0">Historial de correcciones (sesión actual)</h5>
                        <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setHistory([])}
                            title="Limpiar historial"
                        >
                            <i className="ri-delete-bin-line me-1" />Limpiar historial
                        </button>
                    </div>
                    <div className="card">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Activo</th>
                                        <th>Tipo de Corrección</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <small className="fw-semibold d-block">{h.assetCode}</small>
                                                {h.assetName && <small className="text-muted">{h.assetName}</small>}
                                            </td>
                                            <td><small>{h.type}</small></td>
                                            <td><small>{h.date}</small></td>
                                            <td><span className="badge bg-label-success">Cumple NIIF</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NiifCorrectionIndex;
