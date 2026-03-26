import { useState, useEffect } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

const SEGMENT_MAP = {
    LOW:     { label: 'Bajo',                cls: 'bg-label-success'   },
    MEDIUM:  { label: 'Medio',               cls: 'bg-label-warning'   },
    HIGH:    { label: 'Alto',                cls: 'bg-label-danger'    },
    PENDING: { label: 'Pendiente clasificar', cls: 'bg-label-secondary' },
};

const SegmentBadge = ({ value }) => {
    const { label, cls } = SEGMENT_MAP[value] ?? { label: value ?? '-', cls: 'bg-label-secondary' };
    return <span className={`badge ${cls}`}>{label}</span>;
};

const HistorySegmentation = ({
    modalRef,
    modalInstance,
    client,
}) => {

    const [history, setHistory]           = useState([]);
    const [loading, setLoading]           = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onShow = async () => {
            if (!client?.clientId) return;
            setHistory([]);
            setErrorMessage('');

            try {
                setLoading(true);
                const url      = base_url(['api', 'v1', 'ecl-segmentation', 'history', client.clientId]);
                const response = await fetchHelper.get(url, {}, 1000);
                setHistory(response?.data ?? []);
            } catch {
                setErrorMessage('No se pudo cargar el historial. Intente de nuevo.');
            } finally {
                setLoading(false);
            }
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef, client?.clientId]);

    return (
        <div
            className="modal fade"
            ref={modalRef}
            id="modalHistorySegmentation"
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">

                    <div className="modal-header">
                        <div>
                            <h4 className="modal-title mb-0">Historial de Segmentación</h4>
                            {client?.clientName && (
                                <small className="text-muted">{client.clientName}</small>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={!!errorMessage}
                            onChange={() => setErrorMessage('')}
                        />

                        {loading ? (
                            <div className="text-center py-4">
                                <span className="spinner-border text-primary" role="status" />
                                <p className="mt-2 text-muted">Cargando historial...</p>
                            </div>
                        ) : history.length === 0 && !errorMessage ? (
                            <div className="text-center py-4 text-muted">
                                <i className="ri-history-line ri-2x mb-2 d-block" />
                                No hay registros de historial para este cliente.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Fecha cambio</th>
                                            <th>Segmento anterior</th>
                                            <th>Segmento nuevo</th>
                                            <th>Tipo ajuste</th>
                                            <th>Justificación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((row, idx) => (
                                            <tr key={row.id ?? idx}>
                                                <td>{row.changeDate ? row.changeDate.split('T')[0] : '-'}</td>
                                                <td><SegmentBadge value={row.previousSegment} /></td>
                                                <td><SegmentBadge value={row.newSegment} /></td>
                                                <td>
                                                    {row.segmentationSource === 'MANUAL'
                                                        ? <span className="badge bg-label-info">Manual</span>
                                                        : <span className="badge bg-label-secondary">Automático</span>
                                                    }
                                                </td>
                                                <td>
                                                    <span
                                                        title={row.justification ?? ''}
                                                        style={{ cursor: row.justification ? 'help' : 'default' }}
                                                    >
                                                        {row.justification
                                                            ? row.justification.length > 50
                                                                ? `${row.justification.slice(0, 50)}…`
                                                                : row.justification
                                                            : '-'
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>

                    <div className="modal-footer justify-content-end">
                        <button
                            type="button"
                            className="btn btn-danger waves-effect"
                            data-bs-dismiss="modal"
                        >
                            Cerrar
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HistorySegmentation;
