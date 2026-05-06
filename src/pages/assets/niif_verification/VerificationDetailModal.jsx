// ─── Helpers ────────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
    CUMPLE:      { badge: 'bg-label-success', icon: 'ri-checkbox-circle-line text-success', label: 'Cumple' },
    ADVERTENCIA: { badge: 'bg-label-warning', icon: 'ri-error-warning-line text-warning',   label: 'Advertencia' },
    INCUMPLE:    { badge: 'bg-label-danger',  icon: 'ri-close-circle-line text-danger',     label: 'Incumple' },
    WARNING:     { badge: 'bg-label-warning', icon: 'ri-error-warning-line text-warning',   label: 'Advertencia' },
    COMPLIANT:   { badge: 'bg-label-success', icon: 'ri-checkbox-circle-line text-success', label: 'Cumple' },
    NON_COMPLIANT: { badge: 'bg-label-danger', icon: 'ri-close-circle-line text-danger',   label: 'Incumple' },
};

const resolveSeverity = (value) =>
    SEVERITY_CONFIG[value] ?? SEVERITY_CONFIG[String(value).toUpperCase()] ?? SEVERITY_CONFIG.CUMPLE;

const CheckRow = ({ label, result, detail }) => {
    const cfg = resolveSeverity(result);
    return (
        <div className="d-flex align-items-start gap-3 py-2 border-bottom">
            <i className={`${cfg.icon} fs-5 mt-1`} />
            <div className="flex-grow-1">
                <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{label}</div>
                {detail && <small className="text-muted">{detail}</small>}
            </div>
            <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
        </div>
    );
};

// Extrae campos de activo probando múltiples nombres de campo posibles del backend
const extractAssetInfo = (r) => ({
    name:             r.assetName   ?? r.name   ?? r.asset?.name   ?? r.asset?.assetName   ?? 'Activo',
    code:             r.assetCode   ?? r.code   ?? r.asset?.assetCode ?? r.asset?.code     ?? '',
    category:         r.category    ?? r.asset?.category ?? r.assetCategory ?? '',
    acquisitionValue: r.acquisitionValue ?? r.purchaseValue ?? r.asset?.acquisitionValue ?? r.asset?.purchaseValue,
    usefulLife:       r.usefulLife  ?? r.asset?.usefulLife ?? r.usefulLifeYears ?? r.asset?.usefulLifeYears,
    usefulLifeMonths: r.usefulLifeMonths ?? r.newUsefulLifeMonths ?? r.asset?.usefulLifeMonths,
    method:           r.depreciationMethod ?? r.method ?? r.asset?.depreciationMethod ?? r.asset?.method,
});

// Extrae la lista de checks probando múltiples estructuras posibles
// HU-ACT-09 E1+E2 (QA 2026-05-05): el backend ahora devuelve `criteria` con
// {code, name, status, message} para detallar cumple/no-cumple por criterio.
const extractChecks = (r) => {
    if (Array.isArray(r.criteria))
        return r.criteria.map(c => ({
            label:  c.name ?? c.code ?? 'Verificación',
            result: c.status === 'CUMPLE' ? 'CUMPLE'
                  : c.status === 'ADVERTENCIA' ? 'ADVERTENCIA'
                  : 'NO_CUMPLE',
            detail: c.message ?? '',
        }));
    if (Array.isArray(r.checks))          return r.checks;
    if (Array.isArray(r.checkResults))    return r.checkResults;
    if (Array.isArray(r.verifications))   return r.verifications;
    if (Array.isArray(r.alerts))
        return r.alerts.map(a => ({
            label:  a.description ?? a.message ?? a.rule ?? 'Verificación',
            result: a.severity    ?? a.status  ?? 'INCUMPLE',
            detail: a.detail      ?? a.recommendation ?? '',
        }));
    return [];
};

// Extrae sugerencias
const extractSuggestions = (r) => {
    if (Array.isArray(r.suggestions)) return r.suggestions;
    if (Array.isArray(r.recommendations)) return r.recommendations;
    return [];
};

// Determina overallStatus
const resolveOverallStatus = (r) =>
    r.overallStatus ?? r.status ?? r.complianceStatus ?? r.globalStatus ?? 'CUMPLE';

// ─── Componente ─────────────────────────────────────────────────────────────────
const VerificationDetailModal = ({ modalRef, result, onGoToCorrection }) => {

    if (!result) return null;

    const asset       = extractAssetInfo(result);
    const checks      = extractChecks(result);
    const suggestions = extractSuggestions(result);
    const overallStatus = resolveOverallStatus(result);
    const overallCfg  = resolveSeverity(overallStatus);

    const norm = result.applicableNorm ?? result.norm ?? result.niifNorm ?? '';

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-shield-check-line me-2 text-primary" />
                            Detalle de Verificación NIIF
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        {/* Resumen del activo */}
                        <div
                            className="d-flex align-items-center justify-content-between mb-4 p-3 rounded-3"
                            style={{ backgroundColor: 'var(--bs-card-bg, #f8f9fa)', border: '1px solid var(--bs-border-color, #dee2e6)' }}
                        >
                            <div>
                                <div className="fw-bold fs-6">{asset.name}</div>
                                <small className="text-muted">
                                    {[asset.code, asset.category].filter(Boolean).join(' — ')}
                                </small>
                                <div className="mt-1">
                                    <small className="text-muted">
                                        {asset.acquisitionValue != null && (
                                            <>Adquisición: <strong>${Number(asset.acquisitionValue).toLocaleString('es-CO')}</strong>{' · '}</>
                                        )}
                                        {(asset.usefulLife != null || asset.usefulLifeMonths != null) && (
                                            <>
                                                Vida útil: <strong>
                                                    {asset.usefulLife != null
                                                        ? `${asset.usefulLife} años`
                                                        : `${asset.usefulLifeMonths} meses`}
                                                </strong>{' · '}
                                            </>
                                        )}
                                        {asset.method && (
                                            <>Método: <strong>{asset.method}</strong></>
                                        )}
                                    </small>
                                </div>
                            </div>
                            <div className="text-end">
                                <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>Estado global</div>
                                <span className={`badge ${overallCfg.badge} fs-6`}>{overallCfg.label}</span>
                            </div>
                        </div>

                        {/* Norma aplicable */}
                        {norm && (
                            <div className="alert alert-info d-flex align-items-center gap-2 py-2 mb-3">
                                <i className="ri-book-open-line" />
                                <small>Norma aplicable: <strong>{norm}</strong></small>
                            </div>
                        )}

                        {/* Checks */}
                        <h6 className="fw-bold mb-2">Verificaciones realizadas</h6>
                        {checks.length === 0 ? (
                            <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                                El servidor no devolvió detalle de verificaciones individuales.
                            </p>
                        ) : (
                            checks.map((check, idx) => (
                                <CheckRow
                                    key={idx}
                                    label={check.label ?? check.rule ?? check.description ?? `Verificación ${idx + 1}`}
                                    result={check.result ?? check.status ?? check.severity ?? 'CUMPLE'}
                                    detail={check.detail ?? check.message ?? check.recommendation ?? ''}
                                />
                            ))
                        )}

                        {/* Sugerencias */}
                        {suggestions.length > 0 && (
                            <div className="mt-4">
                                <h6 className="fw-bold mb-2">
                                    <i className="ri-lightbulb-line me-1 text-warning" />
                                    Sugerencias de ajuste
                                </h6>
                                <ul className="list-unstyled mb-0">
                                    {suggestions.map((s, i) => (
                                        <li key={i} className="d-flex align-items-start gap-2 mb-2">
                                            <i className="ri-arrow-right-s-line text-primary mt-1" />
                                            <small>{typeof s === 'string' ? s : (s.text ?? s.message ?? JSON.stringify(s))}</small>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Datos crudos de respuesta (debug — sólo si todo está vacío) */}
                        {checks.length === 0 && suggestions.length === 0 && (
                            <div className="mt-3">
                                <details>
                                    <summary className="text-muted" style={{ fontSize: '0.78rem', cursor: 'pointer' }}>
                                        Ver respuesta completa del servidor
                                    </summary>
                                    <pre
                                        className="mt-2 p-2 rounded border"
                                        style={{ fontSize: '0.72rem', maxHeight: '200px', overflowY: 'auto' }}
                                    >
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer d-flex gap-2">
                        {overallStatus !== 'CUMPLE' && overallStatus !== 'COMPLIANT' && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => onGoToCorrection?.(result)}
                            >
                                <i className="ri-tools-line me-1" />
                                Ir a Corrección
                            </button>
                        )}
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationDetailModal;
