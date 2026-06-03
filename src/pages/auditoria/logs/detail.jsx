import { useState, useEffect } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { actionLabel, severityLabel, moduleLabel, entityLabel } from '../../../utils/auditLabels';

/**
 * HU-AU-08 / HU-AU-09 / HU-AU-10 E7: Modal de detalle de evento de auditoría.
 * Muestra metadatos completos + valores antes/después + cadena de hash + link a JE.
 *
 * <p>HU-AU-08 (QA 2026-06-02): la retención legal (legal hold) es un marcador
 * opt-in que veta la purga del registro. Se activa/libera manualmente desde
 * aquí. Mientras esté activa, el proceso de purga excluye el registro y muestra
 * el mensaje "El registro no puede eliminarse mientras exista retención legal
 * activa". El resto de registros se procesa normalmente.
 */
const LogDetail = ({ modalRef, modalInstance, log, onChanged, canManage = true }) => {
    const [lh, setLh] = useState(false);
    const [lhReason, setLhReason] = useState('');
    const [reasonInput, setReasonInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // Sincronizar el estado local del legal hold cada vez que cambia el log mostrado.
    useEffect(() => {
        setLh(!!log?.legalHold);
        setLhReason(log?.legalHoldReason || '');
        setReasonInput('');
        setMsg({ type: '', text: '' });
    }, [log?.id, log?.legalHold]);

    const severityBadge = (s) => {
        const map = {
            LOW: 'bg-label-success', MEDIUM: 'bg-label-info',
            HIGH: 'bg-label-warning', CRITICAL: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{severityLabel(s)}</span>;
    };

    const activate = async () => {
        if (!reasonInput.trim()) {
            setMsg({ type: 'danger', text: 'Debe indicar la razón de la retención legal.' });
            return;
        }
        setBusy(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'audit', 'retention', 'legal-hold', log.id]),
                { reason: reasonInput.trim() }, {}, 0);
            setLh(true);
            setLhReason(reasonInput.trim());
            setReasonInput('');
            setMsg({ type: 'success', text: 'Retención legal activada. El registro queda protegido de la purga.' });
            onChanged && onChanged();
        } catch (err) {
            setMsg({ type: 'danger', text: err?.msg || err?.message || 'No se pudo activar la retención legal.' });
        } finally {
            setBusy(false);
        }
    };

    const release = async () => {
        setBusy(true);
        try {
            await fetchHelper.delete(
                base_url(['api', 'v1', 'audit', 'retention', 'legal-hold', log.id]), {}, {}, 0);
            setLh(false);
            setLhReason('');
            setMsg({ type: 'success', text: 'Retención legal liberada. El registro vuelve a la purga normal al vencer su retención.' });
            onChanged && onChanged();
        } catch (err) {
            setMsg({ type: 'danger', text: err?.msg || err?.message || 'No se pudo liberar la retención legal.' });
        } finally {
            setBusy(false);
        }
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
                                        <div><strong>Acción:</strong> <span className="badge bg-label-primary">{actionLabel(log.action)}</span></div>
                                        <div><strong>Módulo:</strong> {moduleLabel(log.module)}</div>
                                        <div><strong>Severidad:</strong> {severityBadge(log.severity)}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-uppercase text-muted small">Entidad afectada</h6>
                                        <div><strong>Tipo:</strong> {entityLabel(log.entityType) || '-'}</div>
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

                                <h6 className="text-uppercase text-muted small">Metadatos técnicos</h6>
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

                                {/* HU-AU-08 / HU-AU-10 E7: retención legal (legal hold) */}
                                <h6 className="text-uppercase text-muted small mt-4">
                                    <i className="ri-scales-3-line me-1"></i> Retención legal
                                </h6>
                                <div className={`alert ${lh ? 'alert-warning' : 'alert-light border'} small`}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span>
                                            <strong>Estado:</strong>{' '}
                                            {lh
                                                ? <span className="badge bg-label-warning">Retención legal activa</span>
                                                : <span className="badge bg-label-secondary">Sin retención legal</span>}
                                        </span>
                                    </div>
                                    {lh ? (
                                        <>
                                            <div className="mb-2"><strong>Motivo:</strong> {lhReason || '—'}</div>
                                            <div className="text-muted mb-2">
                                                Este registro NO podrá purgarse aunque venza su retención.
                                            </div>
                                            {canManage ? (
                                                <button className="btn btn-sm btn-outline-secondary"
                                                        disabled={busy} onClick={release}>
                                                    {busy
                                                        ? <span className="spinner-border spinner-border-sm me-1"></span>
                                                        : <i className="ri-lock-unlock-line me-1"></i>}
                                                    Liberar retención legal
                                                </button>
                                            ) : (
                                                <div className="text-muted fst-italic">
                                                    <i className="ri-information-line me-1"></i>
                                                    No tiene permisos para liberar la retención legal.
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-muted mb-2">
                                                Active la retención legal para vetar la eliminación de este registro
                                                (ej. evidencia en un proceso judicial o auditoría en curso).
                                            </div>
                                            {canManage ? (
                                                <div className="d-flex gap-2 align-items-start">
                                                    <input type="text" className="form-control form-control-sm"
                                                           placeholder="Motivo de la retención legal (obligatorio)"
                                                           value={reasonInput} disabled={busy}
                                                           onChange={(e) => setReasonInput(e.target.value)} />
                                                    <button className="btn btn-sm btn-warning text-nowrap"
                                                            disabled={busy} onClick={activate}>
                                                        {busy
                                                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                                                            : <i className="ri-lock-line me-1"></i>}
                                                        Activar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-muted fst-italic">
                                                    <i className="ri-information-line me-1"></i>
                                                    No tiene permisos para activar la retención legal.
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {msg.text && (
                                        <div className={`mt-2 mb-0 text-${msg.type === 'danger' ? 'danger' : 'success'}`}>
                                            <i className={`ri-${msg.type === 'danger' ? 'error-warning' : 'checkbox-circle'}-line me-1`}></i>
                                            {msg.text}
                                        </div>
                                    )}
                                </div>

                                <h6 className="text-uppercase text-muted small mt-4">
                                    Cadena de integridad
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
