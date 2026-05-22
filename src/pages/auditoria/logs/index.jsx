import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import LogDetail from './detail';

/**
 * HU-AU-05: Pagina principal de logs de auditoria con busqueda avanzada.
 *
 * <p>Filtros: modulo (multi), accion, severidad (multi), rango de fechas,
 * usuario (email parcial), IP (parcial), User-Agent (parcial), texto libre.
 * HU-AU-05 E1/E3/E4 + HU-AU-02 E4 cubiertos.
 *
 * <p>Botones de export (CSV/XLSX/PDF) que envian los filtros aplicados al
 * backend, asi se exportan SOLO los resultados filtrados (HU-AU-05 E4).
 */
const MODULES = [
    { code: 'PA',  label: 'Parametrizacion' },
    { code: 'TER', label: 'Terceros' },
    { code: 'CFG', label: 'Listas Contables' },
    { code: 'ACT', label: 'Activos' },
    { code: 'AP',  label: 'Cuentas por Pagar' },
    { code: 'AR',  label: 'Cuentas por Cobrar' },
    { code: 'BNK', label: 'Bancos y Cajas' },
    { code: 'CG',  label: 'Contabilidad General' },
    { code: 'NOM', label: 'Nomina' },
    { code: 'INT', label: 'Integracion AAEF' },
    { code: 'AU',  label: 'Auditoria' },
];

const IndexAuditLogs = () => {
    const token = useSelector((state) => state.user.token);
    const [logs, setLogs] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(null); // null | 'csv' | 'xlsx' | 'pdf'
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({
        modules: [],         // multi-select
        action: '',
        severities: [],      // multi-select
        userEmail: '',       // HU-AU-05 E1
        ipAddress: '',       // HU-AU-02 E4
        userAgent: '',       // HU-AU-02 E4
        dateFrom: '',
        dateTo: '',
        searchText: '',
        page: 0,
        size: 20
    });
    const [detailLog, setDetailLog] = useState(null);
    const detailRef = useRef(null);
    const detailInstance = useRef(null);

    const buildBody = () => {
        const body = {};
        if (filters.modules?.length) body.modules = filters.modules;
        if (filters.action)          body.action = filters.action;
        if (filters.severities?.length) body.severities = filters.severities;
        if (filters.userEmail)       body.userEmail = filters.userEmail;
        if (filters.ipAddress)       body.ipAddress = filters.ipAddress;
        if (filters.userAgent)       body.userAgent = filters.userAgent;
        if (filters.dateFrom)        body.dateFrom = filters.dateFrom + 'T00:00:00';
        if (filters.dateTo)          body.dateTo = filters.dateTo + 'T23:59:59';
        if (filters.searchText)      body.searchText = filters.searchText;
        return body;
    };

    const load = async () => {
        setLoading(true);
        try {
            const url = base_url(['api', 'v1', 'audit', 'logs', 'search'],
                                 { page: filters.page, size: filters.size });
            const data = await fetchHelper.post(url, buildBody(), {}, 0);
            setLogs(data || { content: [], totalElements: 0, totalPages: 0, page: 0 });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'Error al cargar logs de auditoria' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.page]);

    const applyFilters = () => {
        if (filters.page !== 0) setFilters({ ...filters, page: 0 });
        else load();
    };

    const clearFilters = () => {
        setFilters({
            modules: [], action: '', severities: [], userEmail: '', ipAddress: '',
            userAgent: '', dateFrom: '', dateTo: '', searchText: '', page: 0, size: 20
        });
    };

    /**
     * HU-AU-05 E4 / HU-AU-06 E2 (2026-04-28): export con filtros aplicados.
     * El backend POST /api/v1/audit/export/{format} acepta el mismo DTO de
     * filtros que /logs/search, por lo que se exporta SOLO el subconjunto
     * filtrado (no los 1000 logs sin importar filtros como antes).
     */
    const exportFiltered = async (format) => {
        setExporting(format);
        try {
            const url = base_url(['api', 'v1', 'audit', 'export', format]);
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                           'Authorization': 'Bearer ' + token },
                body: JSON.stringify(buildBody()),
            });
            if (resp.status === 204) {
                setAlert({ show: true, type: 'warning',
                    message: 'No se encontraron registros para los parametros seleccionados' });
                return;
            }
            if (!resp.ok) {
                const text = await resp.text();
                let msg;
                try { msg = JSON.parse(text)?.message; } catch { msg = text; }
                setAlert({ show: true, type: 'danger',
                    message: msg || 'No se pudo generar el reporte en el formato solicitado' });
                return;
            }
            // HU-AU-08 E7: sin resultados el backend responde 200 con JSON
            // {success:false, message} (no 204). Mostrar el mensaje, no descargar.
            const ctype = resp.headers.get('content-type') || '';
            if (ctype.includes('application/json')) {
                const j = await resp.json().catch(() => ({}));
                setAlert({ show: true, type: 'warning',
                    message: j.message || 'No se encontraron registros para los parametros seleccionados' });
                return;
            }
            const blob = await resp.blob();
            const dlUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = `audit-logs.${format === 'xlsx' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(dlUrl);
            setAlert({ show: true, type: 'success',
                message: 'Exportacion exitosa: ' + format.toUpperCase() });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger',
                message: 'No se pudo generar el reporte en el formato solicitado' });
        } finally {
            setExporting(null);
        }
    };

    const toggleArrayValue = (arr, value) =>
        arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

    const openDetail = (log) => {
        setDetailLog(log);
        if (!detailInstance.current)
            detailInstance.current = new window.bootstrap.Modal(detailRef.current);
        detailInstance.current.show();
    };

    const severityBadge = (s) => {
        const map = { LOW: 'bg-label-success', MEDIUM: 'bg-label-info',
                      HIGH: 'bg-label-warning', CRITICAL: 'bg-label-danger' };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    const actionBadge = (a) => {
        const map = { CREATE: 'bg-label-success', UPDATE: 'bg-label-info',
                      DELETE: 'bg-label-danger', LOGIN: 'bg-label-secondary',
                      LOGOUT: 'bg-label-secondary', EXPORT: 'bg-label-primary',
                      VIEW: 'bg-label-secondary' };
        return <span className={`badge ${map[a] || 'bg-label-secondary'}`}>{a}</span>;
    };

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span><i className="ri-file-list-3-line me-2"></i> Logs de Auditoria</span>
                {/* HU-AU-05 E4 + HU-AU-06: botones export con filtros aplicados */}
                <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-success"
                            disabled={!!exporting}
                            onClick={() => exportFiltered('csv')}>
                        {exporting === 'csv'
                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                            : <i className="ri-file-text-line me-1"></i>}
                        CSV
                    </button>
                    <button className="btn btn-outline-success"
                            disabled={!!exporting}
                            onClick={() => exportFiltered('xlsx')}>
                        {exporting === 'xlsx'
                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                            : <i className="ri-file-excel-2-line me-1"></i>}
                        Excel
                    </button>
                    <button className="btn btn-outline-danger"
                            disabled={!!exporting}
                            onClick={() => exportFiltered('pdf')}>
                        {exporting === 'pdf'
                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                            : <i className="ri-file-pdf-line me-1"></i>}
                        PDF
                    </button>
                </div>
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                {/* HU-AU-05 E3: filtros multi-modulo */}
                <div className="mb-2">
                    <label className="form-label small fw-semibold">Modulos (multi)</label>
                    <div className="d-flex flex-wrap gap-1">
                        {MODULES.map(m => (
                            <button key={m.code}
                                    type="button"
                                    className={`btn btn-sm ${filters.modules.includes(m.code)
                                        ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilters({...filters,
                                        modules: toggleArrayValue(filters.modules, m.code)})}>
                                {m.code}
                            </button>
                        ))}
                    </div>
                </div>
                {/* HU-AU-05 E3: multi-severidad */}
                <div className="mb-3">
                    <label className="form-label small fw-semibold">Severidades (multi)</label>
                    <div className="d-flex flex-wrap gap-1">
                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => (
                            <button key={s}
                                    type="button"
                                    className={`btn btn-sm ${filters.severities.includes(s)
                                        ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilters({...filters,
                                        severities: toggleArrayValue(filters.severities, s)})}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-2">
                        <label className="form-label">Accion</label>
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
                    {/* HU-AU-05 E1: filtro por usuario (email parcial) */}
                    <div className="col-md-3">
                        <label className="form-label">Usuario (email parcial)</label>
                        <input type="text" className="form-control" placeholder="user@empresa1.test"
                               value={filters.userEmail}
                               onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })} />
                    </div>
                    {/* HU-AU-02 E4: filtro IP */}
                    <div className="col-md-2">
                        <label className="form-label">IP (parcial)</label>
                        <input type="text" className="form-control" placeholder="192.168"
                               value={filters.ipAddress}
                               onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })} />
                    </div>
                    {/* HU-AU-02 E4: filtro User-Agent */}
                    <div className="col-md-3">
                        <label className="form-label">User-Agent (parcial)</label>
                        <input type="text" className="form-control" placeholder="Mobile / Chrome"
                               value={filters.userAgent}
                               onChange={(e) => setFilters({ ...filters, userAgent: e.target.value })} />
                    </div>
                    <div className="col-md-2 d-flex align-items-end gap-1">
                        <button className="btn btn-primary btn-sm flex-grow-1" onClick={applyFilters}>
                            <i className="ri-filter-line me-1"></i> Filtrar
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}
                                title="Limpiar filtros">
                            <i className="ri-refresh-line"></i>
                        </button>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Desde</label>
                        <input type="date" className="form-control" value={filters.dateFrom}
                               onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Hasta</label>
                        <input type="date" className="form-control" value={filters.dateTo}
                               onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Texto en descripcion</label>
                        <input type="text" className="form-control"
                               placeholder="Buscar..."
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
                                <th>Accion</th>
                                <th>Entidad</th>
                                <th>Modulo</th>
                                <th>Severidad</th>
                                <th>IP</th>
                                <th>Descripcion</th>
                                <th className="text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="10" className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                </td></tr>
                            )}
                            {!loading && logs.content.length === 0 && (
                                <tr><td colSpan="10" className="text-center text-muted py-4">
                                    No se encontraron registros para los parametros seleccionados
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
                                    <td><small className="text-muted">{l.ipAddress}</small></td>
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
                        <span className="mx-2">Pagina {filters.page + 1} de {logs.totalPages || 1}</span>
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
