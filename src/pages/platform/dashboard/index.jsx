/**
 * Dashboard de Plataforma (HU-PA-PLAT-06).
 *
 * Solo visible para PLATFORM_ADMIN. Muestra KPIs agregados cross-empresa:
 *  - Empresas activas / inactivas
 *  - Total usuarios tenant / platform admins
 *  - JE ultimos 6 meses
 *  - Lotes AAEF totales / con ACK_FAILED
 *  - Top 5 empresas por volumen de JE
 *  - Empresas con ACK fallidos
 *
 * Consume GET /api/platform/dashboard que exige authority PLATFORM_ADMIN.
 * Los tenant admins reciben 403; el PlatformRoute ya los redirige antes.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const PlatformDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const navigate = useNavigate();

    // QA Bloque PA Bug 88 (HU-PA-PLAT-05 E1/E2/E5, 2026-05-11): monitor AAEF
    // integrado en el dashboard. Trae overview de ventanas 24/48/72h + filtro
    // empresa + alertas pendientes >1h. El botón Reintentar AAEF dispara el
    // scheduler manualmente para los ACK_FAILED.
    const [aaef, setAaef] = useState(null);
    const [aaefAlerts, setAaefAlerts] = useState(null);
    const [aaefCompanyFilter, setAaefCompanyFilter] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetchHelper.get(base_url(['api', 'platform', 'dashboard']));
                setData(resp?.data ?? resp);
            } catch (e) {
                setErr(e?.msg || 'Error al cargar el dashboard');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadAaefMonitor = async (companyId) => {
        try {
            const filter = companyId ? `?companyId=${companyId}` : '';
            const overview = await fetchHelper.get(
                base_url(['api', 'platform', 'aaef-monitor', 'overview']) + filter);
            setAaef(overview);
            const alerts = await fetchHelper.get(
                base_url(['api', 'platform', 'aaef-monitor', 'pending-alerts']));
            setAaefAlerts(alerts);
        } catch (e) {
            console.warn('Error cargando monitor AAEF', e);
        }
    };

    useEffect(() => { loadAaefMonitor(''); }, []);

    const Card = ({ title, value, subtitle, color = 'primary', icon }) => (
        <div className="col-md-3 col-sm-6 mb-4">
            <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                    <div className="d-flex align-items-center">
                        {icon && (
                            <div className={`rounded-circle bg-label-${color} d-flex align-items-center justify-content-center me-3`}
                                 style={{ width: 48, height: 48 }}>
                                <i className={`${icon} fs-4`}></i>
                            </div>
                        )}
                        <div>
                            <small className="text-muted d-block">{title}</small>
                            <h3 className="mb-0 fw-bold">{value ?? '—'}</h3>
                            {subtitle && <small className="text-muted">{subtitle}</small>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (err) return <div className="alert alert-danger">{err}</div>;

    const total = (data?.activeCompanies || 0) + (data?.inactiveCompanies || 0);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">Resumen de la plataforma</h4>
                <small className="text-muted">Indicadores globales de todas las empresas</small>
            </div>

            <div className="row">
                <Card title="Empresas activas" value={data?.activeCompanies}
                      subtitle={`de ${total} en total`} color="success"
                      icon="ri-building-4-line" />
                <Card title="Empresas inactivas" value={data?.inactiveCompanies}
                      color="warning" icon="ri-close-circle-line" />
                <Card title="Usuarios de empresas" value={data?.totalTenantUsers}
                      color="info" icon="ri-user-line" />
                <Card title="Administradores del sistema" value={data?.totalPlatformAdmins}
                      color="dark" icon="ri-shield-user-line" />
                <Card title="Comprobantes contables (últimos 6 meses)" value={data?.journalEntriesLast6Months}
                      color="primary" icon="ri-file-list-3-line" />
                <Card title="Lotes recibidos de AgroFusion" value={data?.totalAaefBatches}
                      color="primary" icon="ri-exchange-line" />
                <Card title="Lotes con error de confirmación" value={data?.ackFailedBatches}
                      subtitle="requieren revisión" color="danger"
                      icon="ri-error-warning-line" />
                <Card title="Usuarios en total"
                      value={(data?.totalTenantUsers || 0) + (data?.totalPlatformAdmins || 0)}
                      color="secondary" icon="ri-team-line" />
                {/* QA Bloque PA Bug 87 (HU-PA-PLAT-06 E1, 2026-05-11): widgets faltantes */}
                <Card title="Creadas (últimos 30 días)"
                      value={data?.companiesCreatedLast30Days ?? 0}
                      color="primary" icon="ri-add-circle-line" />
                <Card title="Sin actividad (7 días)"
                      value={data?.companiesWithoutActivityLast7Days ?? 0}
                      color="warning" icon="ri-zzz-line" />
            </div>

            {/* QA Bloque PA Bug 87 (HU-PA-PLAT-06 E1): distribución por régimen */}
            {data?.companiesByRegimen && data.companiesByRegimen.length > 0 && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-header fw-semibold">
                                <i className="ri-pie-chart-line me-2"></i>
                                Distribución de empresas por régimen tributario
                            </div>
                            <div className="card-body">
                                <table className="table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Régimen</th>
                                            <th className="text-end">Empresas</th>
                                            <th>%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.companiesByRegimen.map((r, idx) => {
                                            const tot = data.companiesByRegimen.reduce((s, x) => s + (x.count || 0), 0) || 1;
                                            const pct = ((r.count || 0) * 100 / tot).toFixed(1);
                                            return (
                                                <tr key={idx}>
                                                    <td><span className="badge bg-label-info">{r.regimen}</span></td>
                                                    <td className="text-end fw-bold">{r.count}</td>
                                                    <td style={{width: '40%'}}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="progress flex-grow-1" style={{height: '6px'}}>
                                                                <div className="progress-bar" role="progressbar"
                                                                     style={{width: pct + '%'}}></div>
                                                            </div>
                                                            <small className="text-muted">{pct}%</small>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QA Bloque PA Bug 87 (HU-PA-PLAT-06 E2): salud de servicios 4/4 */}
            {data?.servicesHealth && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-header fw-semibold">
                                <i className="ri-pulse-line me-2"></i>
                                Estado de servicios en tiempo real
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    {['database','aaef','queue','reports'].map(svc => {
                                        const s = data.servicesHealth[svc];
                                        if (!s) return null;
                                        const badgeColor = s.status === 'OK' ? 'success'
                                                         : s.status === 'WARNING' ? 'warning'
                                                         : s.status === 'CRITICAL' ? 'danger'
                                                         : 'secondary';
                                        const labels = {
                                            database: 'Base de datos',
                                            aaef: 'Integración AgroFusion',
                                            queue: 'Cola de procesamiento',
                                            reports: 'Motor de reportes'
                                        };
                                        return (
                                            <div className="col-md-3 mb-3" key={svc}>
                                                <div className={`border rounded p-3 border-${badgeColor}`}>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <strong className="text-truncate">{labels[svc]}</strong>
                                                        <span className={`badge bg-label-${badgeColor}`}>{s.status}</span>
                                                    </div>
                                                    <small className="text-muted d-block">
                                                        {Object.entries(s).filter(([k]) => k !== 'status').map(([k, v]) => (
                                                            <div key={k}>{k}: <strong>{v != null ? String(v) : '-'}</strong></div>
                                                        ))}
                                                    </small>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QA Bloque PA Bug 87 (HU-PA-PLAT-06 E3): métricas de uso */}
            {data?.usageMetrics && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-header fw-semibold">
                                <i className="ri-bar-chart-2-line me-2"></i>
                                Métricas de uso
                            </div>
                            <div className="card-body">
                                <div className="row text-center">
                                    <div className="col-md-3">
                                        <small className="text-muted d-block">Sesiones activas (aprox.)</small>
                                        <strong className="fs-4">{data.usageMetrics.activeSessionsApprox ?? '-'}</strong>
                                    </div>
                                    <div className="col-md-3">
                                        <small className="text-muted d-block">Peticiones/min</small>
                                        <strong className="fs-4">{data.usageMetrics.requestsPerMinuteApprox ?? '-'}</strong>
                                    </div>
                                    <div className="col-md-3">
                                        <small className="text-muted d-block">Errores 5xx (1h)</small>
                                        <strong className={`fs-4 ${(data.usageMetrics.errors5xxLastHour || 0) > 0 ? 'text-danger' : ''}`}>
                                            {data.usageMetrics.errors5xxLastHour ?? '-'}
                                        </strong>
                                    </div>
                                    <div className="col-md-3">
                                        <small className="text-muted d-block">Latencia p95 (s)</small>
                                        <strong className="fs-4">
                                            {data.usageMetrics.p95ResponseSeconds != null
                                                ? Number(data.usageMetrics.p95ResponseSeconds).toFixed(2)
                                                : 'sin datos'}
                                        </strong>
                                    </div>
                                </div>
                                <div className="row text-center mt-3">
                                    <div className="col-md-4">
                                        <small className="text-muted">p50</small>
                                        <div><strong>{data.usageMetrics.p50ResponseSeconds != null
                                            ? `${Number(data.usageMetrics.p50ResponseSeconds).toFixed(2)}s`
                                            : 'sin datos'}</strong></div>
                                    </div>
                                    <div className="col-md-4">
                                        <small className="text-muted">p95</small>
                                        <div><strong>{data.usageMetrics.p95ResponseSeconds != null
                                            ? `${Number(data.usageMetrics.p95ResponseSeconds).toFixed(2)}s`
                                            : 'sin datos'}</strong></div>
                                    </div>
                                    <div className="col-md-4">
                                        <small className="text-muted">p99</small>
                                        <div><strong>{data.usageMetrics.p99ResponseSeconds != null
                                            ? `${Number(data.usageMetrics.p99ResponseSeconds).toFixed(2)}s`
                                            : 'sin datos'}</strong></div>
                                    </div>
                                </div>
                                {data.usageMetrics.note && (
                                    <small className="text-muted mt-3 d-block">
                                        <i className="ri-information-line me-1"></i>
                                        {data.usageMetrics.note}
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QA Bloque PA Bug 88 (HU-PA-PLAT-05 E1/E2/E5, 2026-05-11): monitor AAEF */}
            {aaef && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-header fw-semibold d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <span>
                                    <i className="ri-exchange-line me-2"></i>
                                    Monitor AAEF - distribución por ventana de tiempo
                                </span>
                                <div className="d-flex gap-2 align-items-center">
                                    <select className="form-select form-select-sm" style={{width:'220px'}}
                                            value={aaefCompanyFilter}
                                            onChange={(e) => {
                                                setAaefCompanyFilter(e.target.value);
                                                loadAaefMonitor(e.target.value);
                                            }}>
                                        <option value="">Todas las empresas</option>
                                        {(data?.topCompaniesByJe || []).map(c => (
                                            <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-sm btn-outline-primary"
                                            onClick={() => loadAaefMonitor(aaefCompanyFilter)}>
                                        <i className="ri-refresh-line"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Ventana</th>
                                            <th className="text-end">Total lotes</th>
                                            <th>Distribución por estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['24h','48h','72h','168h'].map(win => {
                                            const w = aaef[win];
                                            if (!w) return null;
                                            const label = win === '168h' ? 'Últimos 7 días' : `Últimas ${win}`;
                                            return (
                                                <tr key={win}>
                                                    <td><strong>{label}</strong></td>
                                                    <td className="text-end fw-bold">{w.total}</td>
                                                    <td>
                                                        {Object.entries(w.byStatus || {}).map(([st, ct]) => {
                                                            const color = st === 'ACK_SENT' ? 'success'
                                                                       : st === 'ACK_FAILED' ? 'danger'
                                                                       : st === 'ACK_PENDING' ? 'warning'
                                                                       : 'secondary';
                                                            return (
                                                                <span key={st} className={`badge bg-label-${color} me-1`}>
                                                                    {st}: {ct}
                                                                </span>
                                                            );
                                                        })}
                                                        {Object.keys(w.byStatus || {}).length === 0 && (
                                                            <small className="text-muted">Sin lotes en esta ventana</small>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alertas AAEF pendientes >1h con detalle */}
            {aaefAlerts && aaefAlerts.data && aaefAlerts.data.length > 0 && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0 border-danger">
                            <div className="card-header fw-semibold text-danger">
                                <i className="ri-alarm-warning-line me-2"></i>
                                Alertas - lotes AAEF con confirmación pendiente &gt;1h
                                <span className="badge bg-label-danger ms-2">{aaefAlerts.alertCount}</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Batch ID</th>
                                            <th>Empresa</th>
                                            <th>Exchange ID</th>
                                            <th>Estado</th>
                                            <th>Recibido</th>
                                            <th className="text-end">Reintentos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aaefAlerts.data.map(a => (
                                            <tr key={a.batchId}>
                                                <td>#{a.batchId}</td>
                                                <td>{a.companyName || `#${a.companyId}`}</td>
                                                <td><code style={{fontSize:'0.75em'}}>{a.exchangeId}</code></td>
                                                <td>
                                                    <span className={`badge bg-label-${a.status === 'ACK_FAILED' ? 'danger' : 'warning'}`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td>{a.receivedAt ? new Date(a.receivedAt).toLocaleString('es-CO') : '-'}</td>
                                                <td className="text-end">{a.ackRetryCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer text-end">
                                <small className="text-muted">
                                    {aaefAlerts.alertMessage}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header fw-semibold">
                            Top 5 empresas con más comprobantes contables
                        </div>
                        <div className="card-body p-0">
                            {data?.topCompaniesByJe?.length ? (
                                <table className="table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Empresa</th>
                                            <th className="text-end">Comprobantes</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.topCompaniesByJe.map(c => (
                                            <tr key={c.companyId}>
                                                <td>{c.companyName}</td>
                                                <td className="text-end fw-bold">{c.value}</td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-outline-primary"
                                                            onClick={() => navigate('/platform/empresas')}
                                                            title={`Ver empresa ${c.companyId}`}>
                                                        <i className="ri-eye-line"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted p-3 mb-0">Sin datos todavía</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header fw-semibold text-danger">
                            Empresas con lotes de integración fallidos
                        </div>
                        <div className="card-body p-0">
                            {data?.companiesWithFailedAck?.length ? (
                                <table className="table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Empresa</th>
                                            <th className="text-end">Lotes fallidos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.companiesWithFailedAck.map(c => (
                                            <tr key={c.companyId}>
                                                <td>{c.companyName}</td>
                                                <td className="text-end fw-bold text-danger">{c.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted p-3 mb-0">
                                    Sin lotes fallidos · todas las integraciones están al día
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* QA Bloque PA Bug 86 (HU-PA-15 E5, 2026-05-11): scheduler de
                vencimiento de permisos temporales en el dashboard centralizado. */}
            {data?.tempPermSchedulerStatus && (
                <div className="row">
                    <div className="col-md-12 mb-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                                <span>
                                    <i className="ri-time-line me-2"></i>
                                    Scheduler de vencimiento de permisos temporales
                                </span>
                                <span className={`badge ${
                                    data.tempPermSchedulerStatus.status === 'OK' ? 'bg-label-success' :
                                    data.tempPermSchedulerStatus.status === 'NEVER_RAN' ? 'bg-label-secondary' :
                                    'bg-label-danger'
                                }`}>
                                    {data.tempPermSchedulerStatus.status}
                                </span>
                            </div>
                            <div className="card-body">
                                {data.tempPermSchedulerStatus.status === 'NEVER_RAN' ? (
                                    <p className="text-muted mb-0">
                                        El scheduler aún no se ha ejecutado. Se programa nocturno; al primer run
                                        aparecerá aquí el resumen.
                                    </p>
                                ) : (
                                    <div className="row text-center">
                                        <div className="col-md-3">
                                            <small className="text-muted d-block">Permisos vencidos</small>
                                            <strong className="fs-5">
                                                {data.tempPermSchedulerStatus.expiredCount ?? '-'}
                                            </strong>
                                        </div>
                                        <div className="col-md-3">
                                            <small className="text-muted d-block">Usuarios notificados</small>
                                            <strong className="fs-5">
                                                {data.tempPermSchedulerStatus.notifiedCount ?? '-'}
                                            </strong>
                                        </div>
                                        <div className="col-md-3">
                                            <small className="text-muted d-block">Duración</small>
                                            <strong className="fs-5">
                                                {data.tempPermSchedulerStatus.durationMs != null
                                                    ? `${data.tempPermSchedulerStatus.durationMs} ms`
                                                    : '-'}
                                            </strong>
                                        </div>
                                        <div className="col-md-3">
                                            <small className="text-muted d-block">Último run</small>
                                            <strong className="fs-6">
                                                {data.tempPermSchedulerStatus.endedAt
                                                    ? new Date(data.tempPermSchedulerStatus.endedAt).toLocaleString('es-CO')
                                                    : '-'}
                                            </strong>
                                        </div>
                                    </div>
                                )}
                                {data.tempPermSchedulerStatus.errorMessage && (
                                    <div className="alert alert-danger mt-3 mb-0">
                                        <strong>Error del último run:</strong> {data.tempPermSchedulerStatus.errorMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformDashboard;
