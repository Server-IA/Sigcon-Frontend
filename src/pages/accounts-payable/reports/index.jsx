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
    /** HU-AP-21 (2026-04-28): datos reporte OCs + filtros. */
    const [poData, setPoData] = useState(null);
    const [poFilters, setPoFilters] = useState({
        thirdPartyId: '', status: '', dateFrom: '', dateTo: ''
    });

    // HU-AP-12 E1 (2026-04-28): export CSV/PDF del reporte de aging.
    const exportAgingCsv = () => {
        if (!agingData) return;
        const lines = [];
        lines.push('Resumen por rango');
        lines.push(['Rango', 'Cantidad facturas', 'Saldo total'].join(';'));
        (agingData.buckets || []).forEach(b => lines.push([b.range, b.count, b.amount].join(';')));
        lines.push(['', 'TOTAL', agingData.totalPending].join(';'));
        lines.push('');
        lines.push('Detalle por factura');
        lines.push(['# Factura', 'Proveedor', 'Saldo', 'Dias vencidos', 'Rango'].join(';'));
        (agingData.invoices || []).forEach(r =>
            lines.push([r.invoiceNumber || '', r.supplierName || '', r.balanceDue, r.daysOverdue, r.range].join(';')));
        // BOM UTF-8 para que Excel detecte acentos correctamente
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aging_cxp_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportAgingPdf = () => {
        // Usa el dialogo de impresion del navegador (Save as PDF). Cumple
        // criterio HU sin agregar dependencia de pdfmake.
        const popup = window.open('', '_blank');
        if (!popup) {
            setMessage({ type: 'warning', show: true,
                message: 'Habilite ventanas emergentes para exportar PDF.' });
            return;
        }
        const buckets = (agingData?.buckets || []).map(b =>
            `<tr><td>${b.range}</td><td>${b.count}</td><td style="text-align:right">${b.amount}</td></tr>`).join('');
        const invoices = (agingData?.invoices || []).map(r =>
            `<tr><td>${r.invoiceNumber || '-'}</td><td>${r.supplierName || '-'}</td>` +
            `<td style="text-align:right">${r.balanceDue}</td><td>${r.daysOverdue}</td><td>${r.range}</td></tr>`).join('');
        popup.document.write(`
            <html><head><title>Aging CxP - ${new Date().toLocaleDateString()}</title>
            <style>
                body{font-family:Arial,sans-serif;padding:20px}
                h1{font-size:18px} h2{font-size:14px;margin-top:24px}
                table{width:100%;border-collapse:collapse;margin-top:8px}
                th,td{border:1px solid #999;padding:6px 8px;font-size:12px}
                th{background:#f0f0f0;text-align:left}
                .total{font-weight:bold;background:#fafafa}
            </style></head><body onload="window.print()">
            <h1>Reporte Aging - Cuentas por Pagar</h1>
            <p>Generado: ${new Date().toLocaleString()}</p>
            <h2>Resumen por rango</h2>
            <table><thead><tr><th>Rango</th><th>Cantidad</th><th>Saldo</th></tr></thead>
            <tbody>${buckets}<tr class="total"><td colspan="2">TOTAL PENDIENTE</td>
            <td style="text-align:right">${agingData?.totalPending || 0}</td></tr></tbody></table>
            <h2>Detalle por factura</h2>
            <table><thead><tr><th># Factura</th><th>Proveedor</th><th>Saldo</th><th>Dias vencidos</th><th>Rango</th></tr></thead>
            <tbody>${invoices || '<tr><td colspan="5">Sin facturas</td></tr>'}</tbody></table>
            </body></html>`);
        popup.document.close();
    };

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

    /** HU-AP-21 (2026-04-28): genera reporte de OCs. */
    const handlePurchaseOrdersReport = async () => {
        try {
            setLoading(true);
            setAgingData(null);
            setSupplierData(null);
            setPoData(null);
            const qs = new URLSearchParams();
            if (poFilters.thirdPartyId) qs.append('thirdPartyId', poFilters.thirdPartyId);
            if (poFilters.status) qs.append('status', poFilters.status);
            if (poFilters.dateFrom) qs.append('dateFrom', poFilters.dateFrom);
            if (poFilters.dateTo) qs.append('dateTo', poFilters.dateTo);
            const url = base_url(['api', 'v1', 'ap', 'reports', 'purchase-orders'])
                + (qs.toString() ? `?${qs.toString()}` : '');
            const response = await fetchHelper.post(url, {}, {}, 0);
            const data = response?.data ?? response;
            setPoData(data);
            setMessage({ type: 'success', show: true, message: 'Reporte de Ordenes de Compra generado.' });
        } catch (error) {
            setMessage({ type: 'danger', show: true,
                message: error?.msg || 'Error al generar el reporte de OCs.' });
        } finally {
            setLoading(false);
        }
    };

    /** Exporta el reporte de OCs a CSV. */
    const exportPoCsv = () => {
        if (!poData) return;
        const lines = [];
        lines.push('Resumen por estado');
        lines.push(['Estado', 'Cantidad', 'Monto'].join(';'));
        (poData.summaryByStatus || []).forEach(s => lines.push([s.status, s.count, s.amount].join(';')));
        lines.push(['', 'TOTAL', poData.totalAmount].join(';'));
        lines.push('');
        lines.push('Detalle');
        lines.push(['# Orden', 'Fecha', 'Proveedor', 'NIT', 'Estado', 'Total'].join(';'));
        (poData.orders || []).forEach(r => lines.push([
            r.orderNumber || '', r.orderDate || '', r.thirdPartyName || '',
            r.thirdPartyNit || '', r.status || '', r.totalAmount
        ].join(';')));
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_ocs_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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

                    {/* HU-AP-21: Reporte de Ordenes de Compra */}
                    <div className="col-md-12 mb-3">
                        <div className="card border shadow-none">
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-2">
                                    <i className="ri-file-list-3-line ri-32px text-warning me-2"></i>
                                    <h6 className="mb-0">Reporte de Ordenes de Compra</h6>
                                </div>
                                <p className="text-muted small mb-2">Listado y resumen de OCs filtrable por proveedor, estado y rango de fechas.</p>
                                <div className="row g-2 align-items-end">
                                    <div className="col-md-4">
                                        <InputSelectModal
                                            label="Proveedor"
                                            value={poFilters.thirdPartyId}
                                            options={suppliers}
                                            onChange={(val) => setPoFilters((p) => ({ ...p, thirdPartyId: val || '' }))}
                                            placeholder="Todos"
                                        />
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small mb-1">Estado</label>
                                        <select className="form-select form-select-sm"
                                            value={poFilters.status}
                                            onChange={(e) => setPoFilters((p) => ({ ...p, status: e.target.value }))}>
                                            <option value="">Todos</option>
                                            <option value="DRAFT">Borrador</option>
                                            <option value="PENDING">Pendiente</option>
                                            <option value="APPROVED">Aprobada</option>
                                            <option value="REJECTED">Rechazada</option>
                                            <option value="RECEIVED">Recibida</option>
                                            <option value="CANCELLED">Cancelada</option>
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small mb-1">Desde</label>
                                        <input type="date" className="form-control form-control-sm"
                                            value={poFilters.dateFrom}
                                            onChange={(e) => setPoFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small mb-1">Hasta</label>
                                        <input type="date" className="form-control form-control-sm"
                                            value={poFilters.dateTo}
                                            onChange={(e) => setPoFilters((p) => ({ ...p, dateTo: e.target.value }))} />
                                    </div>
                                    <div className="col-md-2">
                                        <button className="btn btn-warning w-100"
                                            onClick={handlePurchaseOrdersReport}
                                            disabled={loading}>
                                            {loading ? 'Generando...' : 'Generar'}
                                        </button>
                                    </div>
                                </div>
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
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">Resultado - Aging de Cuentas por Pagar</h6>
                            {/* HU-AP-12 E1 (2026-04-28): exportar a CSV o PDF (impresion) */}
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-success" onClick={() => exportAgingCsv()}>
                                    <i className="ri-file-excel-2-line me-1" />Exportar CSV
                                </button>
                                <button type="button" className="btn btn-sm btn-danger" onClick={() => exportAgingPdf()}>
                                    <i className="ri-file-pdf-line me-1" />Exportar PDF
                                </button>
                            </div>
                        </div>

                        {/* Resumen por rango */}
                        {/* (h6 duplicado removido) */}
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

                {/* HU-AP-21: Resultados reporte OCs */}
                {poData && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">Resultado - Reporte de Ordenes de Compra</h6>
                            <button type="button" className="btn btn-sm btn-success" onClick={exportPoCsv}>
                                <i className="ri-file-excel-2-line me-1" />Exportar CSV
                            </button>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-12">
                                <div className="table-responsive">
                                    <table className="table table-bordered table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                {(poData.summaryByStatus || []).map((s, i) => (
                                                    <th key={i}>{s.status}</th>
                                                ))}
                                                <th>TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                {(poData.summaryByStatus || []).map((s, i) => (
                                                    <td key={i}>
                                                        {formatCurrency(s.amount)}
                                                        <small className="text-muted d-block">{s.count} OC(s)</small>
                                                    </td>
                                                ))}
                                                <td><strong>{formatCurrency(poData.totalAmount)}</strong>
                                                    <small className="text-muted d-block">{poData.totalCount} OC(s)</small>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <h6 className="mb-2">Detalle</h6>
                            <table className="table table-bordered table-striped table-sm">
                                <thead><tr>
                                    <th># Orden</th><th>Fecha</th><th>Proveedor</th><th>NIT</th>
                                    <th>Estado</th><th className="text-end">Total</th>
                                </tr></thead>
                                <tbody>
                                    {(poData.orders || []).length === 0 ? (
                                        <tr><td colSpan="6" className="text-center text-muted">Sin ordenes en el filtro.</td></tr>
                                    ) : (
                                        (poData.orders || []).map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.orderNumber || '-'}</td>
                                                <td>{row.orderDate || '-'}</td>
                                                <td>{row.thirdPartyName || '-'}</td>
                                                <td>{row.thirdPartyNit || '-'}</td>
                                                <td>{row.status}</td>
                                                <td className="text-end">{formatCurrency(row.totalAmount)}</td>
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
