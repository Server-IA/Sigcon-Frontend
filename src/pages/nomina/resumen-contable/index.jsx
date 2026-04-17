import { useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-06 E3: Resumen contable del periodo.
 *
 * <p>Muestra los totales consolidados del periodo + desglose por centro de
 * costo + referencia a los consecutivos de comprobantes CG generados.
 */
const fmt = (n) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

const IndexResumenContable = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const load = async () => {
        setLoading(true);
        try {
            const resp = await fetchHelper.get(
                    base_url(['api', 'nomina', 'reportes', 'resumen-contable'], { year, month }),
                    {}, 0);
            setData(resp);
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err?.msg || 'No se pudo generar el resumen' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-bar-chart-grouped-line me-2"></i>Resumen contable de nómina
                <small className="d-block text-muted mt-1">
                    Totales del periodo + desglose por centro de costo (HU-NOM-06 E3)
                </small>
            </h5>
            <div className="card-body">
                <AlertPage type={alert.type} message={alert.message} show={alert.show}
                        onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <label className="form-label">Año</label>
                        <input type="number" className="form-control" value={year}
                                onChange={e => setYear(Number(e.target.value))} />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Mes</label>
                        <input type="number" min="1" max="12" className="form-control" value={month}
                                onChange={e => setMonth(Number(e.target.value))} />
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                        <button className="btn btn-primary w-100" onClick={load} disabled={loading}>
                            {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                            <i className="ri-pie-chart-line me-1"></i> Generar resumen
                        </button>
                    </div>
                </div>

                {data && (
                    <>
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="card bg-label-primary">
                                    <div className="card-body text-center">
                                        <div className="small">Total recibos</div>
                                        <h4 className="mb-0">{data.totalReceipts}</h4>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-label-success">
                                    <div className="card-body text-center">
                                        <div className="small">Devengados</div>
                                        <h5 className="mb-0">{fmt(data.totalEarnings)}</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-label-warning">
                                    <div className="card-body text-center">
                                        <div className="small">Deducciones</div>
                                        <h5 className="mb-0">{fmt(data.totalDeductions)}</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-label-info">
                                    <div className="card-body text-center">
                                        <div className="small">Aportes patronales</div>
                                        <h5 className="mb-0">{fmt(data.totalEmployerContributions)}</h5>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <h6 className="text-uppercase text-muted small">Devengados por centro de costo</h6>
                                <table className="table table-sm">
                                    <tbody>
                                        {Object.entries(data.earningsByCostCenter || {}).map(([cc, val]) => (
                                            <tr key={cc}>
                                                <td>CC {cc === '0' ? '(sin asignar)' : `#${cc}`}</td>
                                                <td className="text-end">{fmt(val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-md-6">
                                <h6 className="text-uppercase text-muted small">Neto a pagar por centro de costo</h6>
                                <table className="table table-sm">
                                    <tbody>
                                        {Object.entries(data.netByCostCenter || {}).map(([cc, val]) => (
                                            <tr key={cc}>
                                                <td>CC {cc === '0' ? '(sin asignar)' : `#${cc}`}</td>
                                                <td className="text-end">{fmt(val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="alert alert-success">
                            <strong>Total neto a pagar del periodo:</strong>{' '}
                            <span className="fs-5">{fmt(data.totalNetPay)}</span>
                        </div>

                        {data.journalEntryIds && data.journalEntryIds.length > 0 && (
                            <div>
                                <h6 className="text-uppercase text-muted small">Comprobantes contables generados</h6>
                                <div className="d-flex flex-wrap gap-1">
                                    {data.journalEntryIds.map(id => (
                                        <span key={id} className="badge bg-label-success">
                                            JE #{id}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!data && !loading && (
                    <div className="text-center text-muted py-5">
                        Seleccione un periodo y presione "Generar resumen" para consultar.
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexResumenContable;
