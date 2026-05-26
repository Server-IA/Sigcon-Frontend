import { useState, useEffect, useRef } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import LoteDetail from './detail';
// QA (2026-05-26): traducir estados crudos del lote (RECEIVED, PROCESSING,
// ACK_SENT, etc.) a espanol en vez de mostrar el enum del backend.
import { traducir } from '../../../utils/statusLabels';

/**
 * HU-INT-RF-14 y HU-INT-RF-15: Monitoreo de lotes AAEF recibidos desde AgroFusion.
 *
 * <p>Permite:
 * <ul>
 *   <li>Filtrar por sistema origen, estado, rango de fechas, solo con fallidos (E1, E4)</li>
 *   <li>Ver detalle con transfers individuales + accountingEntryId (E2)</li>
 *   <li>Descargar payload JSON original para auditoria (E3)</li>
 *   <li>Reintentar transfers fallidos con retry_allowed=true (HU-INT-RF-15)</li>
 * </ul>
 */
const IndexLotes = () => {
    const [lotes, setLotes] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({
        sourceSystemId: '',
        status: '',
        from: '',
        to: '',
        onlyWithFailed: false,
        page: 0,
        size: 20
    });
    const [detailBatch, setDetailBatch] = useState(null);
    const detailRef = useRef(null);
    const detailInstance = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const query = {};
            if (filters.sourceSystemId) query.sourceSystemId = filters.sourceSystemId;
            if (filters.status) query.status = filters.status;
            if (filters.from) query.from = filters.from;
            if (filters.to) query.to = filters.to;
            if (filters.onlyWithFailed) query.onlyWithFailed = true;
            query.page = filters.page;
            query.size = filters.size;
            const data = await fetchHelper.get(base_url(['api', 'contabilidad', 'lotes'], query), {}, 0);
            setLotes(data || { content: [], totalElements: 0, totalPages: 0, page: 0 });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'Error al cargar lotes' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.page]);

    const applyFilters = () => {
        setFilters({ ...filters, page: 0 });
        load();
    };

    const openDetail = async (lote) => {
        try {
            const data = await fetchHelper.get(base_url(['api', 'contabilidad', 'lotes', lote.id]), {}, 0);
            setDetailBatch(data);
            if (!detailInstance.current)
                detailInstance.current = new window.bootstrap.Modal(detailRef.current);
            detailInstance.current.show();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo cargar el detalle' });
        }
    };

    const downloadPayload = async (lote) => {
        try {
            const url = base_url(['api', 'contabilidad', 'lotes', lote.id, 'payload']);
            const token = localStorage.getItem('token');
            const resp = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const dl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dl;
            a.download = `aaef-batch-${lote.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(dl);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo descargar el payload' });
        }
    };

    const onRetry = (msg) => {
        setAlert({ show: true, type: 'success', message: msg });
        detailInstance.current?.hide();
        load();
    };

    const statusBadge = (s) => {
        const map = {
            RECEIVED: 'bg-label-secondary',
            PROCESSING: 'bg-label-warning',
            PROCESSED: 'bg-label-success',
            PARTIAL: 'bg-label-warning',
            FAILED: 'bg-label-danger',
            ACK_PENDING: 'bg-label-info',
            ACK_SENT: 'bg-label-success',
            ACK_FAILED: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{traducir(s)}</span>;
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-exchange-line me-2"></i> Lotes AAEF recibidos
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label">Sistema origen</label>
                        <input className="form-control" value={filters.sourceSystemId}
                               onChange={(e) => setFilters({ ...filters, sourceSystemId: e.target.value })}
                               placeholder="Disriego, Sigma..." />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Estado</label>
                        <select className="form-select" value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">Todos</option>
                            {['RECEIVED','PROCESSING','PROCESSED','PARTIAL','FAILED','ACK_PENDING','ACK_SENT','ACK_FAILED'].map(s => (
                                <option key={s} value={s}>{traducir(s)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Desde</label>
                        <input type="date" className="form-control" value={filters.from}
                               onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Hasta</label>
                        <input type="date" className="form-control" value={filters.to}
                               onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                    </div>
                    <div className="col-md-3 d-flex align-items-end gap-2">
                        <div className="form-check mb-2">
                            <input type="checkbox" className="form-check-input" id="onlyFailed"
                                   checked={filters.onlyWithFailed}
                                   onChange={(e) => setFilters({ ...filters, onlyWithFailed: e.target.checked })} />
                            <label className="form-check-label small" htmlFor="onlyFailed">Solo con fallidos</label>
                        </div>
                        <button className="btn btn-outline-primary btn-sm" onClick={applyFilters}>
                            <i className="ri-filter-line me-1"></i> Filtrar
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Exchange ID</th>
                                <th>Origen</th>
                                <th>Estado</th>
                                <th className="text-center">Docs</th>
                                <th className="text-center">Fallidos</th>
                                <th>Recibido</th>
                                <th>Procesado</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="9" className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                </td></tr>
                            )}
                            {!loading && lotes.content.length === 0 && (
                                <tr><td colSpan="9" className="text-center text-muted py-4">Sin lotes recibidos</td></tr>
                            )}
                            {!loading && lotes.content.map(l => (
                                <tr key={l.id}>
                                    <td>#{l.id}</td>
                                    <td><code>{l.exchangeId}</code></td>
                                    <td>{l.sourceSystemId || '-'}</td>
                                    <td>{statusBadge(l.status)}</td>
                                    <td className="text-center">{l.totalDocuments}</td>
                                    <td className="text-center">
                                        {l.failedDocuments > 0
                                            ? <span className="badge bg-label-danger">{l.failedDocuments}</span>
                                            : <span className="text-muted">0</span>}
                                    </td>
                                    <td className="small">{l.receivedAt?.replace('T', ' ').substring(0, 19)}</td>
                                    <td className="small">{l.processedAt?.replace('T', ' ').substring(0, 19) || '-'}</td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-label-primary me-1"
                                                onClick={() => openDetail(l)} title="Ver detalle">
                                            <i className="ri-eye-line"></i>
                                        </button>
                                        <button className="btn btn-sm btn-label-info"
                                                onClick={() => downloadPayload(l)} title="Descargar JSON">
                                            <i className="ri-download-2-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        Mostrando {lotes.content.length} de {lotes.totalElements} lotes
                    </small>
                    <div>
                        <button className="btn btn-sm btn-outline-secondary me-2"
                                disabled={filters.page === 0}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                            <i className="ri-arrow-left-s-line"></i> Anterior
                        </button>
                        <span className="mx-2">Página {filters.page + 1} de {lotes.totalPages || 1}</span>
                        <button className="btn btn-sm btn-outline-secondary ms-2"
                                disabled={filters.page >= (lotes.totalPages - 1)}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                            Siguiente <i className="ri-arrow-right-s-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            <LoteDetail modalRef={detailRef} modalInstance={detailInstance}
                        batch={detailBatch} onRetry={onRetry} />
        </div>
    );
};

export default IndexLotes;
