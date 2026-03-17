import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Claves de localStorage para persistir historial de correcciones ────────────
const LS_KEY_CORRECTIONS = 'niif_correction_history';
const LS_KEY_LAST = 'niif_correction_last';

// ─── Constantes ─────────────────────────────────────────────────────────────────
const CORRECTION_TYPES = [
    { id: 'RECLASIFICACION', label: 'Reclasificación' },
    { id: 'REVALUACION', label: 'Revaluación' },
    { id: 'AJUSTE_VIDA_UTIL', label: 'Ajuste de vida útil' },
    { id: 'CAMBIO_METODO', label: 'Cambio de método de depreciación' },
    { id: 'REVERSION_DETERIORO', label: 'Reversión de deterioro' },
];

const CATEGORY_OPTIONS = [
    { id: 'PROPIEDAD_PLANTA_EQUIPO', label: 'Propiedad, Planta y Equipo' },
    { id: 'ACTIVO_INTANGIBLE', label: 'Activo Intangible' },
    { id: 'ARRENDAMIENTO', label: 'Arrendamiento (Leasing)' },
    { id: 'ACTIVO_CORRIENTE', label: 'Activo Corriente' },
    { id: 'OTRO', label: 'Otro' },
];

const DEPRECIATION_METHOD_OPTIONS = [
    { id: 'LINEAR', label: 'Línea recta' },
    { id: 'PRODUCTION_UNITS', label: 'Unidades de producción' },
    { id: 'DECLINING_BALANCE', label: 'Saldo decreciente' },
    { id: 'ACCELERATED', label: 'Acelerado' },
];

// ─── Parámetros NIIF configurados ────────────────────────────────────────────────
// TODO: [API] GET /api/v1/niif-params — Cargar parámetros NIIF desde configuración del sistema
const NIIF_PARAMS = [
    {
        norm: 'NIC 16 (tangible)',
        description: 'Vida útil estándar: 5–20 años',
        minUsefulLife: 5,
        maxUsefulLife: 20,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS', 'DECLINING_BALANCE'],
        category: 'PROPIEDAD_PLANTA_EQUIPO',
    },
    {
        norm: 'NIIF 16 (leasing)',
        description: 'Método permitido: Línea recta / Unidades',
        minUsefulLife: 1,
        maxUsefulLife: 25,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        category: 'ARRENDAMIENTO',
    },
    {
        norm: 'NIC 36',
        description: 'Revisión impairment cada vez que existan indicios',
        minUsefulLife: null,
        maxUsefulLife: null,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS', 'DECLINING_BALANCE', 'ACCELERATED'],
        category: null,
    },
    {
        norm: 'NIC 38 (intangible)',
        description: 'Vida útil: 3–10 años',
        minUsefulLife: 3,
        maxUsefulLife: 10,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        category: 'ACTIVO_INTANGIBLE',
    },
];

// ─── Historial mock inicial (solo se usa si localStorage está vacío) ─────────────
// TODO: [API] GET /api/v1/niif-correction/history — Reemplazar con endpoint real de historial
const MOCK_HISTORY = [
    { id: 'AJUST-2025-09-01', asset: 'Software ERP', type: 'Ajuste Vida Útil', user: 'analista.cont', date: '2025-09-01' },
    { id: 'AJUST-2025-07-15', asset: 'Planta y Equipo', type: 'Revaluación', user: 'admin.contable', date: '2025-07-15' },
];

// ─── Helper: leer persistencia ───────────────────────────────────────────────────
const loadFromStorage = (key, fallback) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch { return fallback; }
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getApplicableParam = (category) =>
    NIIF_PARAMS.find(p => p.category === null || p.category === category) ?? null;

const CORRECTION_TYPE_LABELS = {
    RECLASIFICACION: 'Reclasificación',
    REVALUACION: 'Revaluación',
    AJUSTE_VIDA_UTIL: 'Ajuste Vida Útil',
    CAMBIO_METODO: 'Cambio de Método',
    REVERSION_DETERIORO: 'Reversión Deterioro',
};

// ─── Componente principal ────────────────────────────────────────────────────────
const NiifCorrectionIndex = () => {
    const location = useLocation();

    // ── Estado del formulario ────────────────────────────────────────
    const [correctionType, setCorrectionType] = useState('');
    const [assetCode, setAssetCode] = useState('');
    const [category, setCategory] = useState('');
    const [acquisitionValue, setAcquisitionValue] = useState('');
    const [residualValue, setResidualValue] = useState('');
    const [usefulLife, setUsefulLife] = useState(1);
    const [method, setMethod] = useState('');
    const [justification, setJustification] = useState('');

    // ── Estado UI ────────────────────────────────────────────────────
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    // Inicializar desde localStorage; si no hay nada guardado, usar el mock inicial
    const [history, setHistory] = useState(() => loadFromStorage(LS_KEY_CORRECTIONS, MOCK_HISTORY));
    const [lastCorrection, setLastCorrection] = useState(() => loadFromStorage(LS_KEY_LAST, null));

    // ─── Sincronizar historial → localStorage ────────────────────────────────────
    useEffect(() => {
        try { localStorage.setItem(LS_KEY_CORRECTIONS, JSON.stringify(history)); } catch { /* storage lleno */ }
    }, [history]);

    useEffect(() => {
        try { localStorage.setItem(LS_KEY_LAST, JSON.stringify(lastCorrection)); } catch { /* storage lleno */ }
    }, [lastCorrection]);

    // Autocompletar si viene de verificación
    useEffect(() => {
        const result = location.state?.result;
        if (result) {
            setAssetCode(result.assetCode ?? '');
            setMethod(result.method ?? '');
            setAcquisitionValue(result.acquisitionValue ?? '');
            setUsefulLife(result.usefulLife ?? 1);
        }
    }, []);

    // ── Validación de formulario ─────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!correctionType) e.correctionType = 'Seleccione el tipo de corrección';
        if (!category) e.category = 'Seleccione la categoría del activo';
        if (!acquisitionValue || Number(acquisitionValue) <= 0) e.acquisitionValue = 'Ingrese el valor de adquisición';
        if (!usefulLife || Number(usefulLife) <= 0) e.usefulLife = 'Ingrese la vida útil';
        if (!method) e.method = 'Seleccione el método de depreciación';
        if (!justification.trim()) e.justification = 'La justificación es obligatoria';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Validación NIIF de nuevos valores ───────────────────────────
    const validateNiifRules = () => {
        const param = getApplicableParam(category);
        if (!param) return null;

        if (correctionType === 'AJUSTE_VIDA_UTIL' || correctionType === 'RECLASIFICACION') {
            const ul = Number(usefulLife);
            if (param.minUsefulLife !== null && param.maxUsefulLife !== null) {
                const tolerance = 0.20;
                const min = param.minUsefulLife * (1 - tolerance);
                const max = param.maxUsefulLife * (1 + tolerance);
                if (ul < min || ul > max) {
                    return `El ajuste excede los límites normativos definidos por NIIF. Rango permitido para ${param.norm}: ${param.minUsefulLife}–${param.maxUsefulLife} años (±20%).`;
                }
            }
        }

        if (correctionType === 'CAMBIO_METODO') {
            if (!param.allowedMethods.includes(method)) {
                const label = DEPRECIATION_METHOD_OPTIONS.find(m => m.id === method)?.label ?? method;
                return `El método de depreciación "${label}" no está permitido para esta categoría de activo según ${param.norm}.`;
            }
        }

        return null;
    };

    // ── Aplicar corrección ───────────────────────────────────────────
    const handleApply = async () => {
        if (!validate()) {
            setErrorMessage('Faltan valores obligatorios para realizar la corrección NIIF.');
            return;
        }

        const niifError = validateNiifRules();
        if (niifError) {
            setErrorMessage(niifError);
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const payload = {
                correctionType,
                assetCode: assetCode || `ACT-${Date.now().toString().slice(-4)}`,
                category,
                acquisitionValue: Number(acquisitionValue),
                residualValue: residualValue ? Number(residualValue) : null,
                usefulLifeYears: Number(usefulLife),
                depreciationMethod: method,
                justification,
                niifStatus: 'CUMPLE',
                appliedAt: new Date().toISOString(),
            };

            // TODO: [API] POST /api/v1/niif-correction/apply — Aplicar corrección NIIF y registrar en auditoría
            // Estructura del request body: { correctionType, assetCode, category, acquisitionValue, residualValue, usefulLifeYears, depreciationMethod, justification }
            // Estructura de la respuesta: { id, status: 'CUMPLE', appliedAt, user }
            // await fetchHelper.post(base_url(['api', 'v1', 'niif-correction', 'apply']), payload, {}, 5000);

            // TODO: [API] POST /api/v1/audit/events — Registrar en auditoría con valores anteriores y nuevos
            // await fetchHelper.post(base_url(['api', 'v1', 'audit', 'events']), { module: 'NIIF_CORRECTION', ...payload }, {}, 0);

            // Simulación mientras API no está disponible
            await new Promise(r => setTimeout(r, 700));

            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const corrId = `AJUST-${dateStr}`;
            const catLabel = CATEGORY_OPTIONS.find(c => c.id === category)?.label ?? category;
            const corrLabel = CORRECTION_TYPE_LABELS[correctionType] ?? correctionType;

            const newEntry = {
                id: corrId,
                asset: catLabel,
                type: corrLabel,
                user: 'usuario.actual', // TODO: [API] obtener del estado auth del store Redux
                date: dateStr,
            };

            setHistory(prev => [newEntry, ...prev]);
            setLastCorrection({ date: dateStr, user: newEntry.user });
            setShowSuccess(true);

            // Resetear formulario
            setCorrectionType('');
            setAssetCode('');
            setCategory('');
            setAcquisitionValue('');
            setResidualValue('');
            setUsefulLife(1);
            setMethod('');
            setJustification('');
            setErrors({});

        } catch (err) {
            console.error('Error al aplicar corrección NIIF:', err);
            if (err?.msg?.toLowerCase().includes('periodo') || err?.status === 423) {
                setErrorMessage('No se pueden aplicar correcciones. El periodo contable está cerrado.');
            } else {
                setErrorMessage('No fue posible aplicar la corrección. Contacte al administrador.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrorMessage('');
        setErrors({});
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

                        <AlertPage
                            type="success"
                            message="Ajuste aceptado y aplicado correctamente según NIIF. Corrección registrada en auditoría."
                            show={showSuccess}
                            onChange={() => setShowSuccess(false)}
                        />

                        {/* ── Tipo de Corrección ── */}
                        <p className="text-muted mb-1 mt-3" style={{ fontSize: '0.82rem' }}>
                            Filtre y seleccione uno o varios activos para la verificación.
                        </p>
                        <h6 className="fw-bold mb-3">Tipo de Corrección</h6>
                        <div className="row">
                            <div className="col-12 mb-4">
                                <InputSelectModal
                                    id="corr_type"
                                    label="Corrección"
                                    value={correctionType}
                                    onChange={(v) => { setCorrectionType(v); setErrorMessage(''); }}
                                    options={CORRECTION_TYPES}
                                    placeholder="Seleccione"
                                    error={errors.correctionType}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Datos del Activo ── */}
                        <p className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>
                            Filtre y seleccione uno o varios activos para la verificación.
                        </p>
                        <h6 className="fw-bold mb-3">Datos del Activo</h6>
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <InputModal
                                    type="text"
                                    id="corr_assetCode"
                                    label="Código"
                                    value={assetCode}
                                    onChange={(e) => setAssetCode(e.target.value)}
                                    placeholder="xxx"
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <InputSelectModal
                                    id="corr_category"
                                    label="Categoría"
                                    value={category}
                                    onChange={(v) => { setCategory(v); setErrors(p => { const e = { ...p }; delete e.category; return e; }); }}
                                    options={CATEGORY_OPTIONS}
                                    placeholder="Seleccione"
                                    error={errors.category}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Valores ── */}
                        <h6 className="fw-bold mb-3">Valores</h6>
                        <div className="row">
                            <div className="col-md-3 mb-4">
                                <InputModal
                                    type="number"
                                    id="corr_acqValue"
                                    label="Valor de Adquisición ($)"
                                    value={acquisitionValue}
                                    onChange={(e) => setAcquisitionValue(e.target.value)}
                                    placeholder="$"
                                    error={errors.acquisitionValue}
                                    required
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputModal
                                    type="number"
                                    id="corr_residualValue"
                                    label="Valor de Residual ($)"
                                    value={residualValue}
                                    onChange={(e) => setResidualValue(e.target.value)}
                                    placeholder="$"
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputModal
                                    type="number"
                                    id="corr_usefulLife"
                                    label="Vida Útil (Años)"
                                    value={usefulLife}
                                    onChange={(e) => setUsefulLife(e.target.value)}
                                    error={errors.usefulLife}
                                    placeholder="1"
                                    required
                                />
                            </div>
                            <div className="col-md-3 mb-4">
                                <InputSelectModal
                                    id="corr_method"
                                    label="Método de depreciación"
                                    value={method}
                                    onChange={(v) => { setMethod(v); setErrors(p => { const e = { ...p }; delete e.method; return e; }); }}
                                    options={DEPRECIATION_METHOD_OPTIONS}
                                    placeholder="Seleccionar"
                                    error={errors.method}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Justificación ── */}
                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="corr_justification"
                                    label="Justificación"
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                    error={errors.justification}
                                    placeholder="Placeholder Text"
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
                            <button type="button" className="btn btn-danger" onClick={handleClose}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                CARD — Parámetros NIIF (solo lectura, desde configuración)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        {/* TODO: [API] GET /api/v1/niif-params — Reemplazar constante NIIF_PARAMS con datos del endpoint */}
                        <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>Valores cargados desde configuración</p>
                        <h6 className="fw-bold mb-3">Parámetros NIIF</h6>
                        <ul className="list-unstyled mb-0">
                            {NIIF_PARAMS.map((p, i) => (
                                <li key={i} className="d-flex align-items-start gap-2 mb-2">
                                    <i className="ri-checkbox-blank-circle-fill text-primary mt-1" style={{ fontSize: '0.5rem' }} />
                                    <span style={{ fontSize: '0.875rem' }}>
                                        <strong>{p.norm}:</strong> {p.description}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                HISTORIAL DE CORRECCIONES
            ═══════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                    <h5 className="fw-bold mb-0">Historial de correcciones</h5>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => { setHistory([]); setLastCorrection(null); localStorage.removeItem(LS_KEY_CORRECTIONS); localStorage.removeItem(LS_KEY_LAST); }}
                        title="Limpiar historial"
                    >
                        <i className="ri-delete-bin-line me-1" />Limpiar historial
                    </button>
                </div>
                {/* TODO: [API] GET /api/v1/niif-correction/history — Reemplazar localStorage con endpoint real cuando esté disponible */}
                <div className="card">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Activo</th>
                                    <th>Tipo</th>
                                    <th>Usuario</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center text-muted py-4">No hay correcciones registradas.</td>
                                    </tr>
                                ) : (
                                    history.map((h, idx) => (
                                        <tr key={idx}>
                                            <td><small className="fw-semibold">{h.id}</small></td>
                                            <td><small>{h.asset}</small></td>
                                            <td><small>{h.type}</small></td>
                                            <td><small>{h.user}</small></td>
                                            <td><small>{h.date}</small></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer con última corrección */}
                    {lastCorrection && (
                        <div className="card-footer text-muted" style={{ fontSize: '0.8rem' }}>
                            Última corrección aplicada el{' '}
                            <strong>{lastCorrection.date}</strong> por{' '}
                            <strong>{lastCorrection.user}</strong>{' '}
                            — Estado actual del activo:{' '}
                            <strong className="text-success">Cumple NIIF</strong>.
                        </div>
                    )}
                    {!lastCorrection && history.length > 0 && (
                        <div className="card-footer text-muted" style={{ fontSize: '0.8rem' }}>
                            {/* TODO: [API] Reemplazar con último registro dinámico del historial */}
                            Última corrección aplicada el{' '}
                            <strong>15/09/2025</strong> por{' '}
                            <strong>admin.contable</strong>{' '}
                            — Estado actual del activo:{' '}
                            <strong className="text-success">Cumple NIIF</strong>.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default NiifCorrectionIndex;
