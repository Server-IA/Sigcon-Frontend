import { useState, useEffect, useRef } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import LogDetail from './detail';

/**
 * HU-AU-05: Página principal de logs de auditoría con búsqueda avanzada.
 *
 * <p>Filtros: módulo, acción, severidad, rango de fechas, texto libre.
 * Listado paginado con badges de color por severidad. Click → modal detalle.
 */
const IndexAuditLogs = () => {
    const [logs, setLogs] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({
        module: '', action: '', severity: '',
        dateFrom: '', dateTo: '', searchText: '',
        page: 0, size: 20
    });
    const [detailLog, setDetailLog] = useState(null);
    const detailRef = useRef(null);
    const detailInstance = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const body = {};
            if (filters.module) body.module = filters.module;
            if (filters.action) body.action = filters.action;
            if (filters.severity) body.severity = filters.severity;
            if (filters.dateFrom) body.dateFrom = filters.dateFrom + 'T00:00:00';
            if (filters.dateTo) body.dateTo = filters.dateTo + 'T23:59:59';
            if (filters.searchText) body.searchText = filters.searchText;

            const url = base_url(['api', 'v1', 'audit', 'logs', 'search'],
                                 { page: filters.page, size: filters.size });
            const data = await fetchHelper.post(url, body, {}, 0);
            setLogs(data || { content: [], totalElements: 0, totalPages: 0, page: 0 });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'Error al cargar logs de auditoría' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.page]);

    const applyFilters = () => {
        setFilters({ ...filters, page: 0 });
        load();
    };

    const openDetail = (log) => {
        setDetailLog(log);
        if (!detailInstance.current)
            detailInstance.current = new window.bootstrap.Modal(detailRef.current);
        detailInstance.current.show();
    };

    const severityBadge = (s) => {
        const map = {
            LOW: 'bg-label-success',
            MEDIUM: 'bg-label-info',
            HIGH: 'bg-label-warning',
            CRITICAL: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    const actionBadge = (a) => {
        const map = {
            CREATE: 'bg-label-success', UPDATE: 'bg-label-info',
            DELETE: 'bg-label-danger', LOGIN: 'bg-label-secondary',
            LOGOUT: 'bg-label-secondary', EXPORT: 'bg-label-primary',
            VIEW: 'bg-label-secondary'
        };
        return <span className={`badge ${map[a] || 'bg-label-secondary'}`}>{a}</span>;
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-file-list-3-line me-2"></i> Logs de Auditoría
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="row g-3 mb-3">
                    <div className="col-md-2">
                        <label className="form-label">Módulo</label>
                        <select className="form-select" value={filters.module}
                                onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
                            <option value="">Todos</option>
                            <option value="PA">Parametrización</option>
                            <option value="TER">Terceros</option>
                            <option value="CFG">Listas Contables</option>
                            <option value="ACT">Activos</option>
                            <option value="AP">Cuentas por Pagar</option>
                            <option value="AR">Cuentas por Cobrar</option>
                            <option value="BNK">Bancos</option>
                            <option value="CG">Contabilidad General</option>
                            <option value="NOM">Nómina</option>
                            <option value="INT">Integración AAEF</option>
                            <option value="AU">Auditoría</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Acción</label>
                        <select className="form-select" value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
                            <option value="">Todas</option>
                            <option value="CREATE">CREATE</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                            <option value="LOGIN">LOGIN</option>
                            <option value="LOGOUT">LOGOUT</option>
                            <option value="EXPORT">EXPORT</option>
                            <option value="VIEW">VIEW</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Severidad</label>
                        <select className="form-select" value={filters.severity}
                                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
                            <option value="">Todas</option>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Desde</label>
                        <input type="date" className="form-control" value={filters.dateFrom}
                               onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Hasta</label>
                        <input type="date" className="form-control" value={filters.dateTo}
                               onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                    </div>
                    <div className="col-md-2 d-flex align-items-end gap-2">
                        <button className="btn btn-outline-primary btn-sm w-100" onClick={applyFilters}>
                            <i className="ri-filter-line me-1"></i> Filtrar
                        </button>
                    </div>
                    <div className="col-12">
                        <input type="text" className="form-control"
                               placeholder="Buscar texto en descripción..."
                               value={filters.searchText}
                               onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                               onKeyDown={(e) => e.key === 'Enter' && applyFilters()} />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Fecha</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Entidad</th>
                                <th>Módulo</th>
                                <th>Severidad</th>
                                <th>Descripción</th>
                                <th className="text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="9" className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                </td></tr>
                            )}
                            {!loading && logs.content.length === 0 && (
                                <tr><td colSpan="9" className="text-center text-muted py-4">
                                    Sin logs para los filtros aplicados
                                </td></tr>
                            )}
                            {!loading && logs.content.map(l => (
                                <tr key={l.id}>
                                    <td>#{l.id}</td>
                                    <td><small>{l.timestamp?.replace('T', ' ').substring(0, 19)}</small></td>
                                    <td><small>{l.userEmail}</small></td>
                                    <td>{actionBadge(l.action)}</td>
                                    <td><small>{l.entityType} {l.entityId && `#${l.entityId}`}</small></td>
                                    <td><span className="badge bg-label-secondary">{l.module}</span></td>
                                    <td>{severityBadge(l.severity)}</td>
                                    <td><small>{l.description}</small></td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-label-primary"
                                                onClick={() => openDetail(l)} title="Ver detalle">
                                            <i className="ri-eye-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        Mostrando {logs.content.length} de {logs.totalElements} logs
                    </small>
                    <div>
                        <button className="btn btn-sm btn-outline-secondary me-2"
                                disabled={filters.page === 0}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                            <i className="ri-arrow-left-s-line"></i> Anterior
                        </button>
                        <span className="mx-2">Página {filters.page + 1} de {logs.totalPages || 1}</span>
                        <button className="btn btn-sm btn-outline-secondary ms-2"
                                disabled={filters.page >= (logs.totalPages - 1)}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                            Siguiente <i className="ri-arrow-right-s-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            <LogDetail modalRef={detailRef} modalInstance={detailInstance} log={detailLog} />
        </div>
    );
};

export default IndexAuditLogs;
