import { useState } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';

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
            setAgingData(Array.isArray(data) ? data : [data]);
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
            setSupplierData(Array.isArray(data) ? data : [data]);
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
                                <div className="d-flex justify-content-center gap-2 mb-2">
                                    <InputModal
                                        type="number"
                                        id="ap_report_supplier_id"
                                        label=""
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        placeholder="ID Proveedor"
                                        min={1}
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
                    <div className="table-responsive">
                        <h6 className="mb-3">Resultado - Aging de Cuentas por Pagar</h6>
                        <table className="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Proveedor</th>
                                    <th>Corriente</th>
                                    <th>1-30 dias</th>
                                    <th>31-60 dias</th>
                                    <th>61-90 dias</th>
                                    <th>+90 dias</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agingData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.supplierName || row.thirdPartyName || '-'}</td>
                                        <td>{formatCurrency(row.current)}</td>
                                        <td>{formatCurrency(row.days1to30)}</td>
                                        <td>{formatCurrency(row.days31to60)}</td>
                                        <td>{formatCurrency(row.days61to90)}</td>
                                        <td>{formatCurrency(row.daysOver90)}</td>
                                        <td><strong>{formatCurrency(row.total)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Resultados del estado de cuenta proveedor */}
                {supplierData && (
                    <div className="table-responsive">
                        <h6 className="mb-3">Resultado - Estado de Cuenta Proveedor</h6>
                        <table className="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Factura</th>
                                    <th>Fecha</th>
                                    <th>Total</th>
                                    <th>Pagado</th>
                                    <th>Saldo</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplierData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.invoiceNumber || row.supplierInvoiceNumber || '-'}</td>
                                        <td>{row.invoiceDate || row.date || '-'}</td>
                                        <td>{formatCurrency(row.totalAmount || row.total)}</td>
                                        <td>{formatCurrency(row.paidAmount || row.paid)}</td>
                                        <td>{formatCurrency(row.balance || row.remaining)}</td>
                                        <td>{row.status || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexApReports;
