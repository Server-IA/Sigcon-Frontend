/**
 * HU-AU-08 / HU-AU-09: Modal de detalle de evento de auditoría.
 * Muestra metadatos completos + valores antes/después + cadena de hash + link a JE.
 */
const LogDetail = ({ modalRef, modalInstance, log }) => {
    const severityBadge = (s) => {
        const map = {
            LOW: 'bg-label-success', MEDIUM: 'bg-label-info',
            HIGH: 'bg-label-warning', CRITICAL: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-shield-check-line me-2"></i>
                            Evento de auditoría #{log?.id}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div className="modal-body">
                        {!log && <div className="text-center text-muted">Sin datos</div>}
                        {log && (
                            <>
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <h6 className="text-uppercase text-muted small">General</h6>
                                        <div><strong>Fecha:</strong> {log.timestamp?.replace('T', ' ').substring(0, 19)}</div>
                                        <div><strong>Usuario:</strong> {log.userEmail} (ID {log.userId || '-'})</div>
                                        <div><strong>Acción:</strong> <span className="badge bg-label-primary">{log.action}</span></div>
                                        <div><strong>Módulo:</strong> {log.module}</div>
                                        <div><strong>Severidad:</strong> {severityBadge(log.severity)}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-uppercase text-muted small">Entidad afectada</h6>
                                        <div><strong>Tipo:</strong> {log.entityType || '-'}</div>
                                        <div><strong>ID:</strong> {log.entityId || '-'}</div>
                                        {log.journalEntryId && (
                                            <div><strong>Asiento contable:</strong>
                                                <span className="badge bg-label-info ms-2">JE #{log.journalEntryId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h6 className="text-uppercase text-muted small">Descripción</h6>
                                <p className="mb-3">{log.description}</p>

                                <h6 className="text-uppercase text-muted small">Metadatos técnicos (HU-AU-02)</h6>
                                <div className="row mb-3">
                                    <div className="col-md-4">
                                        <strong>IP:</strong> <code>{log.ipAddress}</code>
                                    </div>
                                    <div className="col-md-8">
                                        <strong>User-Agent:</strong>
                                        <div><small className="text-muted">{log.userAgent}</small></div>
                                    </div>
                                </div>

                                {(log.oldValues || log.newValues) && (
                                    <>
                                        <h6 className="text-uppercase text-muted small">Cambios</h6>
                                        <div className="row mb-3">
                                            {log.oldValues && (
                                                <div className="col-md-6">
                                                    <strong>Antes:</strong>
                                                    <pre className="bg-light p-2 small">{log.oldValues}</pre>
                                                </div>
                                            )}
                                            {log.newValues && (
                                                <div className="col-md-6">
                                                    <strong>Después:</strong>
                                                    <pre className="bg-light p-2 small">{log.newValues}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <h6 className="text-uppercase text-muted small mt-4">
                                    Cadena de integridad (HU-AU-01 E5/E6)
                                </h6>
                                <div className="alert alert-secondary small">
                                    <div><strong>Hash actual:</strong> <code>{log.hash}</code></div>
                                    <div className="mt-1"><strong>Hash anterior:</strong> <code>{log.previousHash}</code></div>
                                    <div className="mt-2 text-muted">
                                        <i className="ri-information-line me-1"></i>
                                        Cada hash se calcula como SHA256(previousHash + timestamp + action + entityType + entityId + userId).
                                        Si alguien modifica un registro, todos los hashes posteriores se invalidan.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogDetail;
