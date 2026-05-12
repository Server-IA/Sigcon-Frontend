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
            </div>

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
