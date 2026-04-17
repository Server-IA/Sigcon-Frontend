import { useState, useEffect } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-AU-07: Dashboard centralizado de auditoría con KPIs y semáforos.
 *
 * <p>Indicadores: total eventos, distribución por severidad/módulo/acción
 * (últimos 30 días), últimos 10 eventos.
 */
const IndexAuditDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const load = async () => {
        setLoading(true);
        try {
            const url = base_url(['api', 'v1', 'audit', 'dashboard']);
            const result = await fetchHelper.get(url, {}, 0);
            setData(result);
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'Error al cargar dashboard de auditoría' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const severityColor = (s) => ({
        LOW: '#28a745', MEDIUM: '#17a2b8',
        HIGH: '#ffc107', CRITICAL: '#dc3545'
    }[s] || '#6c757d');

    const severityBadge = (s) => {
        const map = {
            LOW: 'bg-label-success', MEDIUM: 'bg-label-info',
            HIGH: 'bg-label-warning', CRITICAL: 'bg-label-danger'
        };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{s}</span>;
    };

    const totalLast30Days = data ? Object.values(data.countBySeverity || {}).reduce((a, b) => a + b, 0) : 0;
    const criticalCount = data?.countBySeverity?.CRITICAL || 0;
    const highCount = data?.countBySeverity?.HIGH || 0;

    const maxModuleCount = data ? Math.max(1, ...Object.values(data.countByModule || {})) : 1;

    return (
        <div>
            <h5 className="mb-3">
                <i className="ri-dashboard-line me-2"></i> Dashboard de Auditoría
            </h5>

            <AlertPage message={alert.message} type={alert.type} show={alert.show}
                       onChange={() => setAlert({ show: false, type: '', message: '' })} />

            {loading && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                </div>
            )}

            {!loading && data && (
                <>
                    {/* KPI cards */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <div className="card bg-label-primary">
                                <div className="card-body text-center">
                                    <i className="ri-database-2-line ri-24px"></i>
                                    <div className="small mt-1">Total eventos (histórico)</div>
                                    <h3 className="mb-0">{data.totalEvents}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-label-info">
                                <div className="card-body text-center">
                                    <i className="ri-time-line ri-24px"></i>
                                    <div className="small mt-1">Últimos 30 días</div>
                                    <h3 className="mb-0">{totalLast30Days}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-label-warning">
                                <div className="card-body text-center">
                                    <i className="ri-alert-line ri-24px"></i>
                                    <div className="small mt-1">Eventos HIGH</div>
                                    <h3 className="mb-0">{highCount}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-label-danger">
                                <div className="card-body text-center">
                                    <i className="ri-error-warning-line ri-24px"></i>
                                    <div className="small mt-1">Eventos CRITICAL</div>
                                    <h3 className="mb-0">{criticalCount}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        {/* Semáforo de severidad */}
                        <div className="col-md-6">
                            <div className="card">
                                <h6 className="card-header">Distribución por severidad (últ. 30 días)</h6>
                                <div className="card-body">
                                    {Object.entries(data.countBySeverity || {}).length === 0 && (
                                        <small className="text-muted">Sin datos</small>
                                    )}
                                    {Object.entries(data.countBySeverity || {}).map(([sev, count]) => (
                                        <div key={sev} className="d-flex align-items-center mb-2">
                                            <div style={{
                                                width: '20px', height: '20px',
                                                borderRadius: '50%', background: severityColor(sev),
                                                marginRight: '10px'
                                            }}></div>
                                            <span className="me-2 fw-bold" style={{minWidth: '80px'}}>{sev}</span>
                                            <div className="progress flex-grow-1" style={{height: '20px'}}>
                                                <div className="progress-bar"
                                                     role="progressbar"
                                                     style={{
                                                         width: `${(count / totalLast30Days * 100) || 0}%`,
                                                         background: severityColor(sev)
                                                     }}>
                                                    {count}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Por módulo */}
                        <div className="col-md-6">
                            <div className="card">
                                <h6 className="card-header">Eventos por módulo (últ. 30 días)</h6>
                                <div className="card-body">
                                    {Object.entries(data.countByModule || {}).length === 0 && (
                                        <small className="text-muted">Sin datos</small>
                                    )}
                                    {Object.entries(data.countByModule || {}).map(([mod, count]) => (
                                        <div key={mod} className="d-flex align-items-center mb-2">
                                            <span className="badge bg-label-secondary me-2"
                                                  style={{minWidth: '50px'}}>{mod}</span>
                                            <div className="progress flex-grow-1" style={{height: '20px'}}>
                                                <div className="progress-bar bg-primary"
                                                     role="progressbar"
                                                     style={{width: `${(count / maxModuleCount * 100)}%`}}>
                                                    {count}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Últimos 10 eventos */}
                    <div className="card">
                        <h6 className="card-header">Últimos 10 eventos</h6>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-sm table-hover">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Usuario</th>
                                            <th>Acción</th>
                                            <th>Entidad</th>
                                            <th>Módulo</th>
                                            <th>Severidad</th>
                                            <th>Descripción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.latestEvents || []).map(e => (
                                            <tr key={e.id}>
                                                <td><small>{e.timestamp?.replace('T', ' ').substring(0, 19)}</small></td>
                                                <td><small>{e.userEmail}</small></td>
                                                <td><small><code>{e.action}</code></small></td>
                                                <td><small>{e.entityType} {e.entityId && `#${e.entityId}`}</small></td>
                                                <td><small>{e.module}</small></td>
                                                <td>{severityBadge(e.severity)}</td>
                                                <td><small>{e.description}</small></td>
                                            </tr>
                                        ))}
                                        {(data.latestEvents || []).length === 0 && (
                                            <tr><td colSpan="7" className="text-center text-muted">Sin eventos</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default IndexAuditDashboard;
