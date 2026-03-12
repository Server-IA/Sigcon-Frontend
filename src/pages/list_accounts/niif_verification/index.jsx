import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import VerificationDetailModal from './VerificationDetailModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Constantes ─────────────────────────────────────────────────────────────────
const ASSET_TYPE_OPTIONS = [
    { id: 'CORRIENTE', label: 'Corriente' },
    { id: 'NO_CORRIENTE', label: 'No corriente' },
];

const TANGIBILITY_OPTIONS = [
    { id: 'TANGIBLE', label: 'Tangible' },
    { id: 'INTANGIBLE', label: 'Intangible' },
];

const DEPRECIATION_METHOD_OPTIONS = [
    { id: 'LINEAR', label: 'Línea recta' },
    { id: 'PRODUCTION_UNITS', label: 'Unidades de producción' },
    { id: 'DECLINING_BALANCE', label: 'Saldo decreciente' },
    { id: 'ACCELERATED', label: 'Acelerado' },
];

// ─── Parámetros NIIF (tabla de configuración del sistema) ────────────────────────
// TODO: [API] GET /api/v1/niif-params — Reemplazar con llamada real al endpoint de parámetros NIIF
// Estructura esperada: [{ norm, description, minUsefulLife, maxUsefulLife, allowedMethods, assetType, tangibility, requiresImpairment, impairmentAfterYears, maxRevaluationMonths }]
const NIIF_PARAMS = [
    {
        norm: 'NIC 16 (tangible)',
        description: 'Vida útil estándar: 5–20 años',
        minUsefulLife: 5, maxUsefulLife: 20,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS', 'DECLINING_BALANCE'],
        assetType: 'NO_CORRIENTE', tangibility: 'TANGIBLE',
        requiresImpairment: true, impairmentAfterYears: 5, maxRevaluationMonths: 12,
    },
    {
        norm: 'NIIF 16 (leasing)',
        description: 'Método permitido: Línea recta / Unidades',
        minUsefulLife: 1, maxUsefulLife: 25,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        assetType: 'NO_CORRIENTE', tangibility: 'TANGIBLE',
        requiresImpairment: false, impairmentAfterYears: null, maxRevaluationMonths: 12,
    },
    {
        norm: 'NIC 36',
        description: 'Revisión impairment cada vez que existan indicios',
        minUsefulLife: null, maxUsefulLife: null,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS', 'DECLINING_BALANCE', 'ACCELERATED'],
        assetType: null, tangibility: null,
        requiresImpairment: true, impairmentAfterYears: 3, maxRevaluationMonths: 12,
    },
    {
        norm: 'NIC 38 (intangible)',
        description: 'Vida útil: 3–10 años',
        minUsefulLife: 3, maxUsefulLife: 10,
        allowedMethods: ['LINEAR', 'PRODUCTION_UNITS'],
        assetType: 'NO_CORRIENTE', tangibility: 'INTANGIBLE',
        requiresImpairment: true, impairmentAfterYears: 3, maxRevaluationMonths: 12,
    },
];

// ─── Clave de localStorage para persistir resultados ─────────────────────────────
const LS_KEY = 'niif_verification_results';

// ─── Lógica de verificación NIIF ─────────────────────────────────────────────────
const runNiifVerification = (formData) => {
    const { assetType, tangibility, acquisitionValue, usefulLife, method, acquisitionYear, lastRevaluationMonthsAgo } = formData;

    const applicable = NIIF_PARAMS.filter(p =>
        (p.assetType === null || p.assetType === assetType) &&
        (p.tangibility === null || p.tangibility === tangibility)
    );

    const checks = [];
    let overallStatus = 'CUMPLE';
    const suggestions = [];

    applicable.forEach(param => {
        // CHECK 1 — Método de depreciación (NIC 16, NIIF 16)
        const methodOk = param.allowedMethods.includes(method);
        const methodLabel = DEPRECIATION_METHOD_OPTIONS.find(m => m.id === method)?.label ?? method;
        const methodResult = methodOk ? 'CUMPLE' : 'INCUMPLE';
        checks.push({
            label: `[${param.norm}] Método de depreciación`,
            result: methodResult,
            detail: methodOk
                ? `El método "${methodLabel}" está permitido por ${param.norm}.`
                : `El método "${methodLabel}" NO está permitido por ${param.norm}. Métodos válidos: ${param.allowedMethods.map(id => DEPRECIATION_METHOD_OPTIONS.find(m => m.id === id)?.label ?? id).join(', ')}.`,
        });
        if (!methodOk) { overallStatus = 'INCUMPLE'; suggestions.push(`Cambie el método de depreciación a uno permitido por ${param.norm}.`); }

        // CHECK 2 — Vida útil ±20% (NIC 16, NIC 38)
        if (param.minUsefulLife !== null && param.maxUsefulLife !== null) {
            const ul = Number(usefulLife);
            const tolerance = 0.20;
            const effectiveMin = param.minUsefulLife * (1 - tolerance);
            const effectiveMax = param.maxUsefulLife * (1 + tolerance);
            let lifeResult = 'CUMPLE';
            if (ul < effectiveMin || ul > effectiveMax) {
                lifeResult = (ul < param.minUsefulLife || ul > param.maxUsefulLife) ? 'INCUMPLE' : 'ADVERTENCIA';
            }
            checks.push({
                label: `[${param.norm}] Vida útil`,
                result: lifeResult,
                detail: `Rango estándar: ${param.minUsefulLife}–${param.maxUsefulLife} años (±20%: ${effectiveMin.toFixed(1)}–${effectiveMax.toFixed(1)}). Registrado: ${usefulLife} año(s).`,
            });
            if (lifeResult === 'INCUMPLE') { overallStatus = 'INCUMPLE'; suggestions.push(`Ajuste la vida útil al rango ${param.minUsefulLife}–${param.maxUsefulLife} años (${param.norm}).`); }
            else if (lifeResult === 'ADVERTENCIA' && overallStatus === 'CUMPLE') { overallStatus = 'ADVERTENCIA'; suggestions.push(`Vida útil en zona de tolerancia (±20%) de ${param.norm}. Verifique si aplica excepción.`); }
        }

        // CHECK 3 — Prueba de deterioro / impairment (NIC 36)
        if (param.requiresImpairment && param.impairmentAfterYears !== null && acquisitionYear) {
            const age = new Date().getFullYear() - Number(acquisitionYear);
            const needs = age >= param.impairmentAfterYears;
            checks.push({
                label: `[${param.norm}] Prueba de deterioro (impairment)`,
                result: needs ? 'ADVERTENCIA' : 'CUMPLE',
                detail: needs
                    ? `Activo con ${age} año(s) supera el umbral de ${param.impairmentAfterYears} año(s). Se requiere evaluación de deterioro.`
                    : `Activo con ${age} año(s). Sin necesidad de prueba de deterioro aún.`,
            });
            if (needs && overallStatus === 'CUMPLE') { overallStatus = 'ADVERTENCIA'; suggestions.push(`Realice prueba de impairment — supera los ${param.impairmentAfterYears} años de antigüedad (${param.norm}).`); }
        }

        // CHECK 4 — Periodicidad de revaluación (máx. cada 12 meses)
        if (lastRevaluationMonthsAgo !== '' && lastRevaluationMonthsAgo !== null && lastRevaluationMonthsAgo !== undefined) {
            const months = Number(lastRevaluationMonthsAgo);
            const revalResult = months <= param.maxRevaluationMonths ? 'CUMPLE' : 'ADVERTENCIA';
            checks.push({
                label: `[${param.norm}] Periodicidad de revaluación`,
                result: revalResult,
                detail: revalResult === 'CUMPLE'
                    ? `Última revaluación hace ${months} mes(es). Dentro del límite de ${param.maxRevaluationMonths} meses.`
                    : `Última revaluación hace ${months} mes(es). Excede el límite de ${param.maxRevaluationMonths} meses.`,
            });
            if (revalResult === 'ADVERTENCIA' && overallStatus === 'CUMPLE') { overallStatus = 'ADVERTENCIA'; suggestions.push(`Actualice la revaluación (última fue hace ${months} meses, máximo: ${param.maxRevaluationMonths}).`); }
        }
    });

    const assetTypeLabel = ASSET_TYPE_OPTIONS.find(o => o.id === assetType)?.label ?? assetType;
    const tangibilityLabel = TANGIBILITY_OPTIONS.find(o => o.id === tangibility)?.label ?? tangibility;

    return {
        assetType, tangibility, acquisitionValue, usefulLife, method,
        applicableNorm: applicable.map(p => p.norm).join(', ') || 'No determinada',
        assetName: `Activo (${assetTypeLabel} / ${tangibilityLabel})`,
        assetCode: `ACT-${Date.now().toString().slice(-5)}`,
        category: tangibility === 'INTANGIBLE' ? 'Activo Intangible' : 'Propiedad, Planta y Equipo',
        checks, overallStatus, suggestions,
        verifiedAt: new Date().toLocaleString('es-CO'),
    };
};

// ─── Severidad ───────────────────────────────────────────────────────────────────
const SEVERITY = {
    CUMPLE: { badge: 'bg-label-success', label: 'Cumple' },
    ADVERTENCIA: { badge: 'bg-label-warning', label: 'Advertencia' },
    INCUMPLE: { badge: 'bg-label-danger', label: 'Incumple' },
};

// ─── Helper: encontrar la ruta NIIF_CORRECTION en el menú dinámico ───────────────
// Replica exactamente la lógica de renderMenuRoutesFlat en routes.jsx
const buildMenuPath = (menu, parentPath = '') => {
    const rawPath = menu?.path ?? menu?.url ?? '';
    return rawPath
        ? `/${[parentPath, rawPath].filter(Boolean).join('/')}`
        : `/${parentPath}`;
};

const findCorrectionPath = (modules) => {
    for (const mod of (modules ?? [])) {
        const rootPath = mod?.url ?? '';
        const search = (menus, parent) => {
            for (const menu of (menus ?? [])) {
                const fullPath = buildMenuPath(menu, parent);
                // El backend envía menu.componentName (ver routes.jsx línea 116)
                if (menu.componentName === 'NIIF_CORRECTION') return fullPath;
                if (menu.childrens?.length) {
                    const found = search(menu.childrens, fullPath.replace(/^\//, ''));
                    if (found) return found;
                }
            }
            return null;
        };
        const found = search(mod.menus ?? [], rootPath);
        if (found) return found;
    }
    return null;
};


// ─── Componente principal ────────────────────────────────────────────────────────
const NiifVerificationIndex = () => {
    const navigate = useNavigate();
    // Leer módulos del store para encontrar la ruta de corrección NIIF dinámicamente
    const modules = useSelector(state => state.modules?.modules ?? []);

    const [formData, setFormData] = useState({
        assetType: '', tangibility: '', acquisitionValue: '',
        usefulLife: 1, method: '', acquisitionYear: '', lastRevaluationMonthsAgo: '',
    });

    // ─── PERSISTENCIA: cargar resultados guardados de localStorage ───────────────
    // Nota: Esta es una persistencia LOCAL temporal. Cuando el backend esté listo,
    // reemplazar con: GET /api/v1/assets/niif-verification/history (ver TODO más abajo)
    const [results, setResults] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const detailModalRef = useRef(null);
    const detailModalInstance = useRef(null);

    // ─── Sincronizar resultados → localStorage cada vez que cambian ──────────────
    useEffect(() => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(results));
        } catch { /* silencioso si el storage está lleno */ }
    }, [results]);

    const setField = (field) => (value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
        setErrorMessage('');
    };

    const validate = () => {
        const e = {};
        if (!formData.assetType) e.assetType = 'Seleccione corriente / no corriente';
        if (!formData.tangibility) e.tangibility = 'Seleccione tangible / intangible';
        if (!formData.acquisitionValue || Number(formData.acquisitionValue) <= 0) e.acquisitionValue = 'Ingrese el valor de adquisición';
        if (!formData.usefulLife || Number(formData.usefulLife) <= 0) e.usefulLife = 'Ingrese la vida útil';
        if (!formData.method) e.method = 'Seleccione el método de depreciación';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleVerify = async () => {
        if (!validate()) {
            setErrorMessage('Faltan valores obligatorios para la verificación NIIF (vida útil, método o valor residual)');
            return;
        }
        setErrorMessage('');
        setIsVerifying(true);
        try {
            // TODO: [API] POST /api/v1/assets/niif-verify — Verificar activo contra parámetros NIIF
            // Request body: { assetType, tangibility, acquisitionValue, usefulLifeYears, depreciationMethod, acquisitionYear, lastRevaluationMonthsAgo }
            // Respuesta esperada: { checks:[...], overallStatus:'CUMPLE'|'ADVERTENCIA'|'INCUMPLE', applicableNorm, suggestions:[...], verificationId }
            // const { data } = await fetchHelper.post(base_url(['api', 'v1', 'assets', 'niif-verify']), formData, {}, 5000);
            // const result = data;

            // Simulación frontend mientras API no está disponible:
            await new Promise(r => setTimeout(r, 600));
            const result = runNiifVerification(formData);

            // TODO: [API] POST /api/v1/audit/events — Registrar resultado en Auditoría (obligatorio para INCUMPLE/ADVERTENCIA)
            // await fetchHelper.post(base_url(['api', 'v1', 'audit', 'events']), { module: 'NIIF_VERIFICATION', severity: result.overallStatus, detail: result }, {}, 0);

            setResults(prev => [result, ...prev]);
            setShowSuccess(true);
        } catch (err) {
            console.error('Error en verificación NIIF:', err);
            setErrorMessage('No se pudo procesar la verificación NIIF. Intente nuevamente o revise la configuración de parámetros.');
        } finally {
            setIsVerifying(false);
        }
    };

    // ─── Navegar a la página de Corrección NIIF ──────────────────────────────────
    const goToCorrection = (result) => {
        // Busca la ruta del componente NIIF_CORRECTION en el menú dinámico del backend
        const dynamicPath = findCorrectionPath(modules);
        // TODO: [RUTA] Cuando el backend configure el menú con componentName='NIIF_CORRECTION',
        // `dynamicPath` se resolverá automáticamente. Mientras tanto usa el fallback hardcodeado.
        const fallbackPath = '/niif/correccion'; // TODO: actualizar con la ruta real definida en el backend
        navigate(dynamicPath ?? fallbackPath, { state: { result } });
    };

    const openDetail = (result) => {
        setSelectedResult(result);
        if (!detailModalInstance.current) {
            detailModalInstance.current = new window.bootstrap.Modal(detailModalRef.current);
        }
        detailModalInstance.current.show();
    };

    const handleGoToCorrection = (result) => {
        detailModalInstance.current?.hide();
        goToCorrection(result);
    };

    const handleClearHistory = () => {
        setResults([]);
        localStorage.removeItem(LS_KEY);
    };

    const handleExport = () => {
        const header = ['Activo', 'Código', 'Norma', 'Método', 'Vida Útil', 'Valor Adquisición', 'Estado', 'Fecha'];
        const rows = results.map(r => [
            r.assetName, r.assetCode, r.applicableNorm,
            DEPRECIATION_METHOD_OPTIONS.find(m => m.id === r.method)?.label ?? r.method,
            `${r.usefulLife} años`,
            Number(r.acquisitionValue ?? 0).toLocaleString('es-CO'),
            r.overallStatus, r.verifiedAt,
        ]);
        const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `niif_verificacion_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════════
                CARD — Filtros de Verificación
            ════════════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title fw-bold mb-1">Verificación Cumplimiento de NIIF</h5>
                        <p className="text-muted mb-4" style={{ fontSize: '0.82rem' }}>
                            Filtre y seleccione uno o varios activos para la verificación.
                        </p>

                        <AlertPage
                            type="success"
                            message="Verificación NIIF ejecutada correctamente."
                            show={showSuccess}
                            onChange={() => setShowSuccess(false)}
                        />

                        {/* ── Clasificación del activo ── */}
                        <h6 className="fw-semibold mb-3">Clasificación del activo</h6>
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <InputSelectModal
                                    id="niif_assetType"
                                    label="Corriente / No Corriente"
                                    value={formData.assetType}
                                    onChange={setField('assetType')}
                                    options={ASSET_TYPE_OPTIONS}
                                    placeholder="Corriente"
                                    error={errors.assetType}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <InputSelectModal
                                    id="niif_tangibility"
                                    label="Tangible / Intangible"
                                    value={formData.tangibility}
                                    onChange={setField('tangibility')}
                                    options={TANGIBILITY_OPTIONS}
                                    placeholder="Tangible"
                                    error={errors.tangibility}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Valores ── */}
                        <h6 className="fw-semibold mb-3">Valores</h6>
                        <div className="row">
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="number"
                                    id="niif_acquisitionValue"
                                    label="Valor de Adquisición ($)"
                                    value={formData.acquisitionValue}
                                    onChange={(e) => setField('acquisitionValue')(e.target.value)}
                                    placeholder="Texto"
                                    error={errors.acquisitionValue}
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputModal
                                    type="number"
                                    id="niif_usefulLife"
                                    label="Vida Útil (Años)"
                                    value={formData.usefulLife}
                                    onChange={(e) => setField('usefulLife')(e.target.value)}
                                    placeholder="1"
                                    error={errors.usefulLife}
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-4">
                                <InputSelectModal
                                    id="niif_method"
                                    label="Método de depreciación"
                                    value={formData.method}
                                    onChange={setField('method')}
                                    options={DEPRECIATION_METHOD_OPTIONS}
                                    placeholder="Seleccionar"
                                    error={errors.method}
                                    required
                                />
                            </div>
                        </div>

                        {/* ── Campos opcionales ── */}
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <InputModal
                                    type="number"
                                    id="niif_acquisitionYear"
                                    label="Año de adquisición (opcional, para prueba de deterioro)"
                                    value={formData.acquisitionYear}
                                    onChange={(e) => setField('acquisitionYear')(e.target.value)}
                                    placeholder="Ej. 2019"
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <InputModal
                                    type="number"
                                    id="niif_revaluation"
                                    label="Meses desde última revaluación (opcional)"
                                    value={formData.lastRevaluationMonthsAgo}
                                    onChange={(e) => setField('lastRevaluationMonthsAgo')(e.target.value)}
                                    placeholder="Ej. 6"
                                />
                            </div>
                        </div>

                        {/* ── Error inline (según spec) ── */}
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
                                onClick={handleVerify}
                                disabled={isVerifying}
                            >
                                {isVerifying
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Verificando...</>
                                    : 'Buscar'}
                            </button>
                            {results.length > 0 && (
                                <button type="button" className="btn btn-outline-secondary" onClick={handleExport}>
                                    Exportar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                CARD — Parámetros NIIF (solo lectura, desde configuración)
            ════════════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        {/* TODO: [API] GET /api/v1/niif-params — Reemplazar NIIF_PARAMS con respuesta del endpoint */}
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

            {/* ═══════════════════════════════════════════════════════════════════
                RESULTADOS — Historial de verificaciones (persiste en localStorage)
            ════════════════════════════════════════════════════════════════════ */}
            {/* TODO: [API] GET /api/v1/assets/niif-verification/history — Reemplazar localStorage con endpoint de historial real */}
            {results.length > 0 && (
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                            <h6 className="mb-0 fw-bold">Resultados de Verificación NIIF</h6>
                            <div className="d-flex gap-2 align-items-center">
                                <span className="badge bg-label-primary">{results.length} verificación(es)</span>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={handleClearHistory}
                                    title="Limpiar historial"
                                >
                                    <i className="ri-delete-bin-line me-1" />Limpiar historial
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Activo</th>
                                        <th>Norma</th>
                                        <th>Método</th>
                                        <th>Vida Útil</th>
                                        <th>Valor Adquisición</th>
                                        <th>Estado</th>
                                        <th>Fecha Verificación</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, idx) => {
                                        const cfg = SEVERITY[r.overallStatus] ?? SEVERITY.CUMPLE;
                                        const methodLabel = DEPRECIATION_METHOD_OPTIONS.find(m => m.id === r.method)?.label ?? r.method;
                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{r.assetName}</div>
                                                    <small className="text-muted">{r.assetCode}</small>
                                                </td>
                                                <td><small>{r.applicableNorm}</small></td>
                                                <td><small>{methodLabel}</small></td>
                                                <td><small>{r.usefulLife} años</small></td>
                                                <td><small>${Number(r.acquisitionValue ?? 0).toLocaleString('es-CO')}</small></td>
                                                <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                                                <td><small className="text-muted">{r.verifiedAt}</small></td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        {/* Botón Ver detalle */}
                                                        <button
                                                            className="btn btn-sm btn-label-primary"
                                                            title="Ver detalle"
                                                            onClick={() => openDetail(r)}
                                                        >
                                                            <i className="ri-eye-line" />
                                                        </button>
                                                        {/* Botón Herramientas / Ir a Corrección (visible para ADVERTENCIA e INCUMPLE) */}
                                                        {r.overallStatus !== 'CUMPLE' && (
                                                            <button
                                                                className="btn btn-sm btn-label-warning"
                                                                title="Ir a corrección NIIF"
                                                                onClick={() => goToCorrection(r)}
                                                            >
                                                                <i className="ri-tools-line" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de detalle ── */}
            <VerificationDetailModal
                modalRef={detailModalRef}
                result={selectedResult}
                onGoToCorrection={handleGoToCorrection}
            />
        </>
    );
};

export default NiifVerificationIndex;
