import { Fragment, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-INT-RF-14 E2 + HU-INT-RF-15: Modal de detalle de un lote AAEF.
 * Muestra metadata completa + lista de transfers con su estado individual
 * y accountingEntryId. Permite reintentar documentos fallidos que tengan
 * retryAllowed=true.
 *
 * <p>HU-INT-RF-15 E4: cada transfer tiene boton "Ver historial" que abre un
 * panel inline con la lista cronologica de intentos (inicial + retries),
 * mostrando quien gatillo cada intento, cuando, con que resultado y nota.
 */
const LoteDetail = ({ modalRef, modalInstance, batch, onRetry }) => {
    const [retryingId, setRetryingId] = useState(null);
    const [error, setError] = useState('');
    const [historyByTransfer, setHistoryByTransfer] = useState({}); // {transferId: [entries]}
    const [loadingHistoryId, setLoadingHistoryId] = useState(null);

    const statusBadge = (s) => {
        const map = {
            PENDING: 'bg-label-secondary',
            PROCESSED: 'bg-label-success',
            FAILED: 'bg-label-danger',
            RETRYING: 'bg-label-warning',
            RECEIVED: 'bg-label-secondary',
            PROCESSING: 'bg-label-warning',
            PARTIAL: 'bg-label-warning',
            ACK_PENDING: 'bg-label-info',
            ACK_SENT: 'bg-label-success',
            ACK_FAILED: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    const toggleHistory = async (transferId) => {
        // Si ya esta abierto, cerrarlo
        if (historyByTransfer[transferId] !== undefined) {
            const next = { ...historyByTransfer };
            delete next[transferId];
            setHistoryByTransfer(next);
            return;
        }
        setLoadingHistoryId(transferId);
        setError('');
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'contabilidad', 'transferencias', transferId, 'history']),
                {}, 0);
            setHistoryByTransfer(prev => ({ ...prev, [transferId]: resp.history || [] }));
        } catch (err) {
            setError(err?.message || err?.msg || 'No se pudo cargar el historial');
        } finally {
            setLoadingHistoryId(null);
        }
    };

    const historyResultBadge = (s) => {
        const map = {
            SUCCESS: 'bg-label-success',
            FAILED: 'bg-label-danger',
            RETRYING: 'bg-label-warning',
            SKIPPED: 'bg-label-secondary'
        };
        return <span className={`badge badge-sm ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    const retry = async (transfer) => {
        if (!transfer.retryAllowed) {
            setError('Este error no permite reintento. Solicite nuevo envío a AgroFusion (HU-INT-RF-15 E2)');
            return;
        }
        const note = window.prompt('Nota del reintento (opcional):', '');
        if (note === null) return;
        setRetryingId(transfer.id);
        setError('');
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'contabilidad', 'transferencias', transfer.id, 'retry'], { note }),
                {}, {}, 0);
            onRetry(`Reintento disparado (nuevo batch #${resp.newBatchId}, intento #${resp.retryCount})`);
        } catch (err) {
            setError(err?.message || err?.msg || 'No se pudo reintentar');
        } finally {
            setRetryingId(null);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-file-search-line me-2"></i>
                            Detalle del lote #{batch?.id}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {!batch && <div className="text-center text-muted">Sin datos</div>}

                        {batch && (
                            <>
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <h6 className="text-uppercase text-muted small">Metadata</h6>
                                        <div><strong>Exchange ID:</strong> <code>{batch.exchangeId}</code></div>
                                        <div><strong>Versión AAEF:</strong> {batch.standardVersion}</div>
                                        <div><strong>Sistema origen:</strong> {batch.sourceSystemId} {batch.sourceSystemName && <span className="text-muted">({batch.sourceSystemName})</span>}</div>
                                        <div><strong>Estado:</strong> {statusBadge(batch.status)}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-uppercase text-muted small">Procesamiento</h6>
                                        <div><strong>Recibido:</strong> <small>{batch.receivedAt?.replace('T', ' ').substring(0, 19)}</small></div>
                                        <div><strong>Procesado:</strong> <small>{batch.processedAt?.replace('T', ' ').substring(0, 19) || '-'}</small></div>
                                        <div><strong>ACK enviado:</strong> <small>{batch.ackSentAt?.replace('T', ' ').substring(0, 19) || '-'}</small></div>
                                        <div><strong>Reintentos ACK:</strong> {batch.ackRetryCount || 0}</div>
                                    </div>
                                </div>

                                {/* El bloque "payroll" del estandar AAEF fue retirado del alcance el
                                    2026-04-16 (ver CLAUDE.md). Solo se muestran las tres tarjetas
                                    vigentes: total documentos, facturas y transacciones. */}
                                <div className="row g-3 mb-4">
                                    <div className="col-md-4">
                                        <div className="card bg-label-primary">
                                            <div className="card-body text-center">
                                                <div className="small">Total documentos</div>
                                                <h4 className="mb-0">{batch.totalDocuments}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-label-info">
                                            <div className="card-body text-center">
                                                <div className="small">Facturas</div>
                                                <h4 className="mb-0">{batch.totalInvoices || 0}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-label-warning">
                                            <div className="card-body text-center">
                                                <div className="small">Transacciones</div>
                                                <h4 className="mb-0">{batch.totalTransactions || 0}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {batch.errorMessage && (
                                    <div className="alert alert-warning">
                                        <strong>Error:</strong> {batch.errorMessage}
                                    </div>
                                )}

                                {/* QA Bloque BK (HU-INT-RF-02 E5 + HU-INT-RF-03 E4, 2026-05-18):
                                    warnings informativos detectados al recibir el lote
                                    (UpdatedAt ausente, DocumentId duplicado intra-batch).
                                    NO bloquean el procesamiento; se muestran al QA/Soporte
                                    para que pueda actuar (notificar a AgroFusion, etc.) */}
                                {batch.warnings && batch.warnings.length > 0 && (
                                    <div className="alert alert-warning mt-3">
                                        <h6 className="alert-heading mb-2">
                                            <i className="ri-error-warning-line me-1"></i>
                                            Advertencias informativas ({batch.warnings.length})
                                        </h6>
                                        <ul className="mb-0 small">
                                            {batch.warnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                        <div className="small text-muted mt-2">
                                            <em>El lote fue aceptado y procesado. Estas advertencias se
                                            registran solo para trazabilidad — no requieren reenvio.</em>
                                        </div>
                                    </div>
                                )}

                                <h6 className="text-uppercase text-muted small mt-4">
                                    Documentos del lote ({batch.transfers?.length || 0})
                                </h6>
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover">
                                        <thead>
                                            <tr>
                                                <th>Document ID</th>
                                                <th>Tipo</th>
                                                <th>Estado</th>
                                                <th>Asiento</th>
                                                <th>Error</th>
                                                <th className="text-center">Reintentos</th>
                                                <th className="text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(batch.transfers || []).map(t => (
                                                <Fragment key={t.id}>
                                                <tr>
                                                    <td><code>{t.documentId}</code></td>
                                                    <td><small>{t.documentType}</small></td>
                                                    <td>{statusBadge(t.transferStatus)}</td>
                                                    <td>
                                                        {t.accountingEntryId
                                                            ? <span className="badge bg-label-success">JE #{t.accountingEntryId}</span>
                                                            : <span className="text-muted">-</span>}
                                                    </td>
                                                    <td>
                                                        {t.errorCode && (
                                                            <>
                                                                <code className="text-danger">{t.errorCode}</code>
                                                                {t.errorMessage && <div className="small text-muted">{t.errorMessage}</div>}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="text-center">{t.retryCount || 0}</td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-label-info me-1"
                                                                disabled={loadingHistoryId === t.id}
                                                                onClick={() => toggleHistory(t.id)}
                                                                title="Ver historial de intentos (HU-INT-RF-15 E4)">
                                                            {loadingHistoryId === t.id
                                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                                : <i className={historyByTransfer[t.id] !== undefined
                                                                    ? "ri-arrow-up-s-line"
                                                                    : "ri-history-line"}></i>}
                                                        </button>
                                                        {t.transferStatus === 'FAILED' && t.retryAllowed && (
                                                            <button className="btn btn-sm btn-label-warning"
                                                                    disabled={retryingId === t.id}
                                                                    onClick={() => retry(t)}
                                                                    title="Reintentar (HU-INT-RF-15)">
                                                                {retryingId === t.id
                                                                    ? <span className="spinner-border spinner-border-sm"></span>
                                                                    : <i className="ri-refresh-line"></i>}
                                                            </button>
                                                        )}
                                                        {t.transferStatus === 'FAILED' && !t.retryAllowed && (
                                                            <small className="text-muted" title="HU-INT-RF-15 E2">No reintentable</small>
                                                        )}
                                                    </td>
                                                </tr>
                                                {historyByTransfer[t.id] !== undefined && (
                                                    <tr>
                                                        <td colSpan="7" className="bg-lighter">
                                                            <div className="p-2">
                                                                <h6 className="text-uppercase text-muted small mb-2">
                                                                    <i className="ri-history-line me-1"></i>
                                                                    Historial de intentos (HU-INT-RF-15 E4)
                                                                </h6>
                                                                {historyByTransfer[t.id].length === 0 && (
                                                                    <small className="text-muted">Sin entradas en el historial.</small>
                                                                )}
                                                                {historyByTransfer[t.id].length > 0 && (
                                                                    <table className="table table-sm table-borderless mb-0">
                                                                        <thead>
                                                                            <tr className="small text-muted">
                                                                                <th>#</th>
                                                                                <th>Resultado</th>
                                                                                <th>Origen</th>
                                                                                <th>Por</th>
                                                                                <th>Cuándo</th>
                                                                                <th>Detalle</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {historyByTransfer[t.id].map(h => (
                                                                                <tr key={h.id}>
                                                                                    <td><code>{h.attemptNumber}</code></td>
                                                                                    <td>{historyResultBadge(h.resultStatus)}</td>
                                                                                    <td>
                                                                                        <span className={`badge ${h.triggerSource === 'MANUAL' ? 'bg-label-primary' : 'bg-label-secondary'}`}>
                                                                                            {h.triggerSource}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td><small>{h.triggeredBy || '-'}</small></td>
                                                                                    <td><small>{h.occurredAt?.replace('T', ' ').substring(0, 19)}</small></td>
                                                                                    <td>
                                                                                        {h.errorCode && <code className="text-danger small">{h.errorCode}</code>}
                                                                                        {h.errorMessage && <div className="small text-muted">{h.errorMessage}</div>}
                                                                                        {h.accountingEntryId && (
                                                                                            <span className="badge bg-label-success">JE #{h.accountingEntryId}</span>
                                                                                        )}
                                                                                        {h.newBatchId && (
                                                                                            <div className="small">
                                                                                                <i className="ri-arrow-right-line"></i>{' '}
                                                                                                Batch #{h.newBatchId}
                                                                                            </div>
                                                                                        )}
                                                                                        {h.userNote && (
                                                                                            <div className="small fst-italic text-muted">
                                                                                                "{h.userNote}"
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
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

export default LoteDetail;
