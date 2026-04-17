import { useEffect, useState } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Cartera Vencida (Cuentas por Cobrar).
 * Cubre HU AR-10: muestra aging, facturas vencidas y proximas a vencer.
 */

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexArOverdue = () => {
    const [aging, setAging] = useState([]);
    const [overdue, setOverdue] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [upcomingDays, setUpcomingDays] = useState(7);
    const [overdueMinDays, setOverdueMinDays] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Carga aging, vencidas y proximas a vencer. */
    const loadAll = async () => {
        setLoading(true);
        setMessage({ show: false });
        try {
            const [agingRes, overdueRes, upcomingRes] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'ar', 'reports', 'aging'])),
                fetchHelper.get(
                    base_url(['api', 'v1', 'ar', 'invoices', 'overdue'])
                    + (overdueMinDays ? `?days=${overdueMinDays}` : '')
                ),
                fetchHelper.get(
                    base_url(['api', 'v1', 'ar', 'invoices', 'upcoming'])
                    + `?days=${upcomingDays}`
                ),
            ]);
            setAging(agingRes?.data || []);
            setOverdue(overdueRes?.data || []);
            setUpcoming(upcomingRes?.data || []);
        } catch (error) {
            setMessage({
                show: true,
                type: 'danger',
                message: error?.msg || 'Error cargando cartera',
            });
        } finally {
            setLoading(false);
        }
    };

    /** Dispara manualmente el recalculo de estados OVERDUE. */
    const runUpdateOverdue = async () => {
        try {
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'sales-invoices', 'update-overdue']), {}
            );
            setMessage({
                show: true,
                type: 'success',
                message: res?.message || 'Estados actualizados',
            });
            loadAll();
        } catch (error) {
            setMessage({
                show: true,
                type: 'danger',
                message: error?.msg || 'Error actualizando estados',
            });
        }
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
            />
            <div className="card mb-3">
                <h5 className="card-header">Aging de Cartera</h5>
                <div className="card-body">
                    <div className="row">
                        {aging.map((b) => (
                            <div key={b.bucket} className="col-md-3 mb-2">
                                <div className="card bg-label-warning h-100">
                                    <div className="card-body text-center">
                                        <h6 className="card-title">{b.bucket} dias</h6>
                                        <p className="mb-0 fw-bold">{formatCurrency(b.totalBalance)}</p>
                                        <small>{b.invoiceCount} facturas</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={loadAll}
                            disabled={loading}
                        >
                            <i className="ri-refresh-line me-1" />
                            Refrescar
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={runUpdateOverdue}
                        >
                            <i className="ri-time-line me-1" />
                            Actualizar estados OVERDUE
                        </button>
                    </div>
                </div>
            </div>

            <div className="card mb-3">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span>Facturas Vencidas</span>
                    <div>
                        <label className="me-2">Mora minima (dias):</label>
                        <input
                            type="number"
                            min="0"
                            value={overdueMinDays}
                            onChange={(e) => setOverdueMinDays(Number(e.target.value))}
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: 80 }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary ms-2"
                            onClick={loadAll}
                        >
                            Filtrar
                        </button>
                    </div>
                </h5>
                <div className="card-body">
                    <table className="table table-sm table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>Numero</th><th>Cliente</th><th>NIT</th>
                                <th>Vence</th><th>Saldo</th><th>Dias Mora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdue.length === 0 && (
                                <tr><td colSpan="6" className="text-center">Sin facturas vencidas</td></tr>
                            )}
                            {overdue.map((r) => (
                                <tr key={r.invoiceId}>
                                    <td>{r.invoiceNumber}</td>
                                    <td>{r.thirdPartyName}</td>
                                    <td>{r.thirdPartyNit}</td>
                                    <td>{r.dueDate}</td>
                                    <td>{formatCurrency(r.balanceDue)}</td>
                                    <td><span className="badge bg-label-danger">{r.daysOverdue}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card mb-3">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span>Proximas a Vencer</span>
                    <div>
                        <label className="me-2">En proximos dias:</label>
                        <input
                            type="number"
                            min="1"
                            value={upcomingDays}
                            onChange={(e) => setUpcomingDays(Number(e.target.value))}
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: 80 }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary ms-2"
                            onClick={loadAll}
                        >
                            Filtrar
                        </button>
                    </div>
                </h5>
                <div className="card-body">
                    <table className="table table-sm table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>Numero</th><th>Cliente</th><th>NIT</th>
                                <th>Vence</th><th>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcoming.length === 0 && (
                                <tr><td colSpan="5" className="text-center">Sin facturas proximas a vencer</td></tr>
                            )}
                            {upcoming.map((r) => (
                                <tr key={r.invoiceId}>
                                    <td>{r.invoiceNumber}</td>
                                    <td>{r.thirdPartyName}</td>
                                    <td>{r.thirdPartyNit}</td>
                                    <td>{r.dueDate}</td>
                                    <td>{formatCurrency(r.balanceDue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IndexArOverdue;
