// ─── Helpers ────────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
    CUMPLE: { badge: 'bg-label-success', icon: 'ri-checkbox-circle-line text-success', label: 'Cumple' },
    ADVERTENCIA: { badge: 'bg-label-warning', icon: 'ri-error-warning-line text-warning', label: 'Advertencia' },
    INCUMPLE: { badge: 'bg-label-danger', icon: 'ri-close-circle-line text-danger', label: 'Incumple' },
};

const CheckRow = ({ label, result, detail }) => {
    const cfg = SEVERITY_CONFIG[result] || SEVERITY_CONFIG.CUMPLE;
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

// ─── Componente ─────────────────────────────────────────────────────────────────
const VerificationDetailModal = ({ modalRef, result, onGoToCorrection }) => {

    if (!result) return null;

    const overallCfg = SEVERITY_CONFIG[result.overallStatus] || SEVERITY_CONFIG.CUMPLE;

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
                        <div className="d-flex align-items-center justify-content-between mb-4 p-3 rounded-3"
                            style={{ backgroundColor: 'var(--bs-card-bg, #f8f9fa)', border: '1px solid var(--bs-border-color, #dee2e6)' }}>
                            <div>
                                <div className="fw-bold fs-6">{result.assetName ?? 'Activo'}</div>
                                <small className="text-muted">{result.assetCode ?? ''} — {result.category ?? ''}</small>
                                <div className="mt-1">
                                    <small className="text-muted">
                                        Adquisición: <strong>${Number(result.acquisitionValue ?? 0).toLocaleString('es-CO')}</strong>
                                        {' · '}Vida útil: <strong>{result.usefulLife ?? '-'} años</strong>
                                        {' · '}Método: <strong>{result.method ?? '-'}</strong>
                                    </small>
                                </div>
                            </div>
                            <div className="text-end">
                                <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>Estado global</div>
                                <span className={`badge ${overallCfg.badge} fs-6`}>{overallCfg.label}</span>
                            </div>
                        </div>

                        {/* Norma aplicable */}
                        {result.applicableNorm && (
                            <div className="alert alert-info d-flex align-items-center gap-2 py-2 mb-3">
                                <i className="ri-book-open-line" />
                                <small>Norma aplicable: <strong>{result.applicableNorm}</strong></small>
                            </div>
                        )}

                        {/* Checks detallados */}
                        <h6 className="fw-bold mb-2">Verificaciones realizadas</h6>
                        {(result.checks ?? []).map((check, idx) => (
                            <CheckRow
                                key={idx}
                                label={check.label}
                                result={check.result}
                                detail={check.detail}
                            />
                        ))}

                        {/* Sugerencias */}
                        {result.suggestions && result.suggestions.length > 0 && (
                            <div className="mt-4">
                                <h6 className="fw-bold mb-2">
                                    <i className="ri-lightbulb-line me-1 text-warning" />
                                    Sugerencias de ajuste
                                </h6>
                                <ul className="list-unstyled mb-0">
                                    {result.suggestions.map((s, i) => (
                                        <li key={i} className="d-flex align-items-start gap-2 mb-2">
                                            <i className="ri-arrow-right-s-line text-primary mt-1" />
                                            <small>{s}</small>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer d-flex gap-2">
                        {result.overallStatus !== 'CUMPLE' && (
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
