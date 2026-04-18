import { useEffect, useState } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Pagina de Reportes de Cuentas por Pagar.
 * Permite generar:
 * - Reporte de Aging (antiguedad de saldos)
 * - Estado de Cuenta por Proveedor
 */

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApReports = () => {
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [loading, setLoading] = useState(false);
    const [supplierId, setSupplierId] = useState('');
    const [suppliers, setSuppliers] = useState([]);

    // Cargar catalogo de terceros con rol PROVEEDOR para el dropdown
    useEffect(() => {
        const loadSuppliers = async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'third-parties', 'search']),
                    { length: -1, columns: [] }, {}, 0
                );
                const list = resp?.data ?? resp;
                if (Array.isArray(list)) {
                    setSuppliers(list
                        .filter((t) => (t.roles || []).some((r) => r.name === 'PROVEEDOR'))
                        .map((t) => ({
                            id: t.id,
                            name: `${t.nit || ''}${t.dv ? '/' + t.dv : ''} - ${t.businessName || t.firstName || ''}`.trim(),
                        }))
                    );
                }
            } catch (e) { /* noop */ }
        };
        loadSuppliers();
    }, []);

    /** Datos del reporte de aging. */
    const [agingData, setAgingData] = useState(null);
    /** Datos del estado de cuenta proveedor. */
    const [supplierData, setSupplierData] = useState(null);

    /** Genera reporte de Aging. */
    const handleAging = async () => {
        try {
            setLoading(true);
            setAgingData(null);
            setSupplierData(null);
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'reports', 'aging']),
                {},
                {},
                0
            );
            const data = response?.data ?? response;
            setAgingData(data);
            setMessage({ type: 'success', show: true, message: 'Reporte de aging generado.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al generar el reporte de aging.',
            });
        } finally {
            setLoading(false);
        }
    };

    /** Genera estado de cuenta por proveedor. */
    const handleSupplierReport = async () => {
        if (!supplierId || Number(supplierId) <= 0) {
            setMessage({ type: 'warning', show: true, message: 'Ingrese un ID de proveedor valido.' });
            return;
        }

        try {
            setLoading(true);
            setAgingData(null);
            setSupplierData(null);
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'reports', 'supplier', supplierId]),
                {},
                {},
                0
            );
            const data = response?.data ?? response;
            setSupplierData(data);
            setMessage({ type: 'success', show: true, message: 'Estado de cuenta generado.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al generar el estado de cuenta.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Reportes Cuentas por Pagar</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Seccion de botones de reportes */}
                <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                        <div className="card border shadow-none">
                            <div className="card-body text-center">
                                <i className="ri-bar-chart-2-line ri-48px text-primary mb-2"></i>
                                <h6>Reporte de Aging</h6>
                                <p className="text-muted small">Antiguedad de saldos pendientes por pagar.</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAging}
                                    disabled={loading}
                                >
                                    {loading ? 'Generando...' : 'Generar Reporte'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 mb-3">
                        <div className="card border shadow-none">
                            <div className="card-body text-center">
                                <i className="ri-file-user-line ri-48px text-info mb-2"></i>
                                <h6>Estado de Cuenta Proveedor</h6>
                                <p className="text-muted small">Movimientos y saldos de un proveedor especifico.</p>
                                <div className="mb-2 text-start">
                                    <InputSelectModal
                                        label="Proveedor"
                                        value={supplierId}
                                        options={suppliers}
                                        onChange={(val) => setSupplierId(val)}
                                        placeholder="Seleccione un proveedor"
                                    />
                                </div>
                                <button
                                    className="btn btn-info"
                                    onClick={handleSupplierReport}
                                    disabled={loading}
                                >
                                    {loading ? 'Generando...' : 'Generar Reporte'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resultados del reporte de aging */}
                {agingData && (
                    <div>
                        <h6 className="mb-3">Resultado - Aging de Cuentas por Pagar</h6>

                        {/* Resumen por rango */}
                        <div className="table-responsive mb-4">
                            <table className="table table-bordered">
                                <thead>
                                    <tr>
                                        {(agingData.buckets || []).map((b, i) => (
                                            <th key={i}>{b.range}</th>
                                        ))}
                                        <th>Total Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {(agingData.buckets || []).map((b, i) => (
                                            <td key={i}>
                                                {formatCurrency(b.amount)}
                                                <small className="text-muted d-block">{b.count} factura(s)</small>
                                            </td>
                                        ))}
                                        <td><strong>{formatCurrency(agingData.totalPending)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Detalle por factura */}
                        <div className="table-responsive">
                            <h6 className="mb-2">Detalle por factura</h6>
                            <table className="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>Factura</th>
                                        <th>Proveedor</th>
                                        <th>Saldo</th>
                                        <th>Dias vencidos</th>
                                        <th>Rango</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(agingData.invoices || []).length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted">Sin facturas pendientes.</td></tr>
                                    ) : (
                                        (agingData.invoices || []).map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.invoiceNumber || '-'}</td>
                                                <td>{row.supplierName || '-'}</td>
                                                <td>{formatCurrency(row.balanceDue)}</td>
                                                <td>{row.daysOverdue}</td>
                                                <td>{row.range}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Resultados del estado de cuenta proveedor */}
                {supplierData && (
                    <div>
                        <h6 className="mb-3">Resultado - Estado de Cuenta Proveedor</h6>
                        <div className="mb-3">
                            <p className="mb-1"><strong>Proveedor:</strong> {supplierData.supplierName || '-'} {supplierData.supplierNit ? `(NIT: ${supplierData.supplierNit})` : ''}</p>
                            <div className="row g-2">
                                <div className="col-md-4"><strong>Total Facturado:</strong> {formatCurrency(supplierData.totalInvoiced)}</div>
                                <div className="col-md-4"><strong>Total Pagado:</strong> {formatCurrency(supplierData.totalPaid)}</div>
                                <div className="col-md-4"><strong>Saldo Pendiente:</strong> {formatCurrency(supplierData.totalBalance)}</div>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Documento</th>
                                        <th>Fecha</th>
                                        <th>Monto</th>
                                        <th>Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(supplierData.lines || []).length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted">Sin movimientos.</td></tr>
                                    ) : (
                                        (supplierData.lines || []).map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.type || '-'}</td>
                                                <td>{row.documentNumber || '-'}</td>
                                                <td>{row.date || '-'}</td>
                                                <td>{formatCurrency(row.amount)}</td>
                                                <td>{row.balance != null ? formatCurrency(row.balance) : '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexApReports;
