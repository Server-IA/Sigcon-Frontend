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

    // Cargar catalogo de terceros activos para el dropdown.
    // NOTE (QA fix 2026-05-05): antes filtraba unicamente por rol PROVEEDOR.
    // Las OCs pueden estar asociadas a terceros con cualquier rol (ej. mixto
    // CLIENTE+PROVEEDOR o terceros legacy sin rol PROVEEDOR explicito), por
    // lo que el dropdown se desincronizaba con el listado del reporte
    // (mostraba unos en la lista y otros distintos en el detalle). Ahora se
    // carga todo tercero ACTIVO del tenant — el reporte ya filtra por OCs
    // realmente existentes.
    useEffect(() => {
        const loadSuppliers = async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'third-parties', 'search']),
                    { length: -1, columns: [] }, {}, 0
                );
                const list = resp?.data ?? resp;
                if (Array.isArray(list)) {
                    // status puede venir como objeto {id, name} o string (depende
                    // del DTO de search). Aceptar ambas formas.
                    const isActive = (s) => !s
                        || (typeof s === 'string' && s === 'ACTIVO')
                        || (typeof s === 'object' && s.name === 'ACTIVO');
                    const mapped = list
                        .filter((t) => isActive(t.status))
                        .map((t) => ({
                            id: t.id,
                            name: `${t.nit || ''}${t.dv ? '/' + t.dv : ''} - ${t.businessName || t.firstName || ''}`.trim(),
                        }));
                    // QA fix 2026-05-05: opcion "Todos" seleccionable para limpiar
                    // el filtro sin reiniciar la pagina. Sentinel id='__ALL__' que
                    // se convierte a '' (= sin filtro) en onChange.
                    setSuppliers([{ id: '__ALL__', name: 'Todos' }, ...mapped]);
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
            // Aislamiento entre reportes: cualquier nuevo Generar limpia los demas
            setAgingData(null);
            setSupplierData(null);
            setPoData(null);
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

    /** Helper generico: descarga un Blob con nombre. */
    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    /** Helper: HTML table-as-Excel (MIME application/vnd.ms-excel). */
    const buildXlsHtml = (title, sections) => {
        // sections = [{ heading, headers:[], rows:[[]] }, ...]
        const today = new Date().toLocaleString();
        const tables = sections.map(sec => {
            const head = `<tr>${sec.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
            const body = (sec.rows || []).map(r =>
                `<tr>${r.map(c => `<td>${c == null ? '' : c}</td>`).join('')}</tr>`).join('');
            return `<h3>${sec.heading}</h3><table border="1" cellspacing="0" cellpadding="4">`
                + `<thead>${head}</thead><tbody>${body}</tbody></table>`;
        }).join('<br/>');
        return `<html><head><meta charset="UTF-8"><title>${title}</title></head>`
            + `<body><h2>${title}</h2><p>Generado: ${today}</p>${tables}</body></html>`;
    };

    /** Helper: PDF via dialogo de impresion del navegador. */
    const printPdf = (title, htmlBody) => {
        const popup = window.open('', '_blank');
        if (!popup) {
            setMessage({ type: 'warning', show: true,
                message: 'Habilite ventanas emergentes para exportar PDF.' });
            return;
        }
        popup.document.write(`<html><head><title>${title}</title>
            <style>body{font-family:Arial,sans-serif;padding:20px}
            h1{font-size:18px} h2{font-size:14px;margin-top:24px}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{border:1px solid #999;padding:6px 8px;font-size:12px}
            th{background:#f0f0f0;text-align:left}
            .total{font-weight:bold;background:#fafafa}</style>
            </head><body onload="window.print()">${htmlBody}</body></html>`);
        popup.document.close();
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
        triggerDownload(blob, `reporte_ocs_${new Date().toISOString().slice(0,10)}.csv`);
    };

    /** Exporta el reporte de OCs a XLSX (HTML table-as-Excel). */
    const exportPoXlsx = () => {
        if (!poData) return;
        const summary = (poData.summaryByStatus || []).map(s => [s.status, s.count, s.amount]);
        summary.push(['TOTAL', poData.totalCount || '', poData.totalAmount]);
        const detail = (poData.orders || []).map(r => [
            r.orderNumber || '', r.orderDate || '', r.thirdPartyName || '',
            r.thirdPartyNit || '', r.status || '', r.totalAmount
        ]);
        const html = buildXlsHtml('Reporte Ordenes de Compra', [
            { heading: 'Resumen por estado', headers: ['Estado', 'Cantidad', 'Monto'], rows: summary },
            { heading: 'Detalle', headers: ['# Orden', 'Fecha', 'Proveedor', 'NIT', 'Estado', 'Total'], rows: detail },
        ]);
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        triggerDownload(blob, `reporte_ocs_${new Date().toISOString().slice(0,10)}.xls`);
    };

    /** Exporta el reporte de OCs a PDF. */
    const exportPoPdf = () => {
        if (!poData) return;
        const summary = (poData.summaryByStatus || []).map(s =>
            `<tr><td>${s.status}</td><td>${s.count}</td><td style="text-align:right">${s.amount}</td></tr>`).join('');
        const orders = (poData.orders || []).map(r =>
            `<tr><td>${r.orderNumber || '-'}</td><td>${r.orderDate || '-'}</td>` +
            `<td>${r.thirdPartyName || '-'}</td><td>${r.thirdPartyNit || '-'}</td>` +
            `<td>${r.status}</td><td style="text-align:right">${r.totalAmount}</td></tr>`).join('');
        const body = `
            <h1>Reporte Ordenes de Compra</h1>
            <p>Generado: ${new Date().toLocaleString()}</p>
            <h2>Resumen por estado</h2>
            <table><thead><tr><th>Estado</th><th>Cantidad</th><th>Monto</th></tr></thead>
            <tbody>${summary}<tr class="total"><td colspan="2">TOTAL</td>
            <td style="text-align:right">${poData.totalAmount || 0}</td></tr></tbody></table>
            <h2>Detalle</h2>
            <table><thead><tr><th># Orden</th><th>Fecha</th><th>Proveedor</th><th>NIT</th><th>Estado</th><th>Total</th></tr></thead>
            <tbody>${orders || '<tr><td colspan="6">No se encontraron registros con los criterios seleccionados.</td></tr>'}</tbody></table>`;
        printPdf('Reporte OCs', body);
    };

    /** Exporta el aging a XLSX. */
    const exportAgingXlsx = () => {
        if (!agingData) return;
        const buckets = (agingData.buckets || []).map(b => [b.range, b.count, b.amount]);
        buckets.push(['TOTAL', '', agingData.totalPending]);
        const invoices = (agingData.invoices || []).map(r => [
            r.invoiceNumber || '', r.supplierName || '', r.balanceDue, r.daysOverdue, r.range
        ]);
        const html = buildXlsHtml('Aging Cuentas por Pagar', [
            { heading: 'Resumen por rango', headers: ['Rango', 'Cantidad facturas', 'Saldo total'], rows: buckets },
            { heading: 'Detalle por factura', headers: ['# Factura', 'Proveedor', 'Saldo', 'Dias vencidos', 'Rango'], rows: invoices },
        ]);
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        triggerDownload(blob, `aging_cxp_${new Date().toISOString().slice(0,10)}.xls`);
    };

    /** Exporta el estado de cuenta proveedor a CSV. */
    const exportSupplierCsv = () => {
        if (!supplierData) return;
        const lines = [];
        lines.push(`Proveedor;${supplierData.supplierName || ''}${supplierData.supplierNit ? ' (NIT ' + supplierData.supplierNit + ')' : ''}`);
        lines.push(`Total Facturado;${supplierData.totalInvoiced || 0}`);
        lines.push(`Total Pagado;${supplierData.totalPaid || 0}`);
        lines.push(`Saldo Pendiente;${supplierData.totalBalance || 0}`);
        lines.push('');
        lines.push(['Tipo', 'Documento', 'Fecha', 'Monto', 'Saldo'].join(';'));
        (supplierData.lines || []).forEach(r => lines.push([
            r.type || '', r.documentNumber || '', r.date || '', r.amount, r.balance == null ? '' : r.balance
        ].join(';')));
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        triggerDownload(blob, `estado_cuenta_proveedor_${new Date().toISOString().slice(0,10)}.csv`);
    };

    /** Exporta el estado de cuenta proveedor a XLSX. */
    const exportSupplierXlsx = () => {
        if (!supplierData) return;
        const head = [
            ['Proveedor', supplierData.supplierName || '', supplierData.supplierNit ? 'NIT ' + supplierData.supplierNit : ''],
            ['Total Facturado', '', supplierData.totalInvoiced || 0],
            ['Total Pagado', '', supplierData.totalPaid || 0],
            ['Saldo Pendiente', '', supplierData.totalBalance || 0],
        ];
        const detail = (supplierData.lines || []).map(r => [
            r.type || '', r.documentNumber || '', r.date || '', r.amount, r.balance == null ? '' : r.balance
        ]);
        const html = buildXlsHtml('Estado de Cuenta Proveedor', [
            { heading: 'Resumen', headers: ['Concepto', '', 'Valor'], rows: head },
            { heading: 'Movimientos', headers: ['Tipo', 'Documento', 'Fecha', 'Monto', 'Saldo'], rows: detail },
        ]);
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        triggerDownload(blob, `estado_cuenta_proveedor_${new Date().toISOString().slice(0,10)}.xls`);
    };

    /** Exporta el estado de cuenta proveedor a PDF. */
    const exportSupplierPdf = () => {
        if (!supplierData) return;
        const lines = (supplierData.lines || []).map(r =>
            `<tr><td>${r.type || '-'}</td><td>${r.documentNumber || '-'}</td>` +
            `<td>${r.date || '-'}</td><td style="text-align:right">${r.amount}</td>` +
            `<td style="text-align:right">${r.balance == null ? '-' : r.balance}</td></tr>`).join('');
        const body = `
            <h1>Estado de Cuenta Proveedor</h1>
            <p>Generado: ${new Date().toLocaleString()}</p>
            <p><strong>Proveedor:</strong> ${supplierData.supplierName || '-'}
            ${supplierData.supplierNit ? '(NIT ' + supplierData.supplierNit + ')' : ''}</p>
            <table><tbody>
            <tr><th>Total Facturado</th><td style="text-align:right">${supplierData.totalInvoiced || 0}</td></tr>
            <tr><th>Total Pagado</th><td style="text-align:right">${supplierData.totalPaid || 0}</td></tr>
            <tr><th>Saldo Pendiente</th><td style="text-align:right">${supplierData.totalBalance || 0}</td></tr>
            </tbody></table>
            <h2>Movimientos</h2>
            <table><thead><tr><th>Tipo</th><th>Documento</th><th>Fecha</th><th>Monto</th><th>Saldo</th></tr></thead>
            <tbody>${lines || '<tr><td colspan="5">Sin movimientos</td></tr>'}</tbody></table>`;
        printPdf('Estado Cuenta Proveedor', body);
    };

    /** Genera estado de cuenta por proveedor. */
    const handleSupplierReport = async () => {
        if (!supplierId || Number(supplierId) <= 0) {
            setMessage({ type: 'warning', show: true, message: 'Ingrese un ID de proveedor valido.' });
            return;
        }

        try {
            setLoading(true);
            // Aislamiento entre reportes
            setAgingData(null);
            setSupplierData(null);
            setPoData(null);
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
                                            onChange={(val) => setPoFilters((p) => ({
                                                ...p,
                                                thirdPartyId: (val === '__ALL__' || !val) ? '' : val
                                            }))}
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
                                        options={suppliers.filter((s) => s.id !== '__ALL__')}
                                        onChange={(val) => setSupplierId(val === '__ALL__' ? '' : (val || ''))}
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

                {/* SECCION 1: Resultados Aging */}
                {agingData && (
                    <div className="card border shadow-none mt-4">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h6 className="mb-0">
                                <i className="ri-bar-chart-2-line me-2 text-primary" />
                                Resultado - Aging de Cuentas por Pagar
                            </h6>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-success" onClick={() => exportAgingCsv()}>
                                    <i className="ri-file-excel-2-line me-1" />CSV
                                </button>
                                <button type="button" className="btn btn-sm btn-success" onClick={() => exportAgingXlsx()}>
                                    <i className="ri-file-excel-2-line me-1" />Excel
                                </button>
                                <button type="button" className="btn btn-sm btn-danger" onClick={() => exportAgingPdf()}>
                                    <i className="ri-file-pdf-line me-1" />PDF
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
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
                        </div>{/* /card-body aging */}
                    </div>
                )}

                {/* SECCION 2: Resultados Reporte OCs */}
                {poData && (
                    <div className="card border shadow-none mt-4">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h6 className="mb-0">
                                <i className="ri-file-list-3-line me-2 text-warning" />
                                Resultado - Reporte de Ordenes de Compra
                            </h6>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-success" onClick={exportPoCsv}>
                                    <i className="ri-file-excel-2-line me-1" />CSV
                                </button>
                                <button type="button" className="btn btn-sm btn-success" onClick={exportPoXlsx}>
                                    <i className="ri-file-excel-2-line me-1" />Excel
                                </button>
                                <button type="button" className="btn btn-sm btn-danger" onClick={exportPoPdf}>
                                    <i className="ri-file-pdf-line me-1" />PDF
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
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
                                        <tr><td colSpan="6" className="text-center text-muted">No se encontraron registros con los criterios seleccionados.</td></tr>
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
                        </div>{/* /card-body OCs */}
                    </div>
                )}

                {/* SECCION 3: Estado de Cuenta Proveedor */}
                {supplierData && (
                    <div className="card border shadow-none mt-4">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h6 className="mb-0">
                                <i className="ri-file-user-line me-2 text-info" />
                                Resultado - Estado de Cuenta Proveedor
                            </h6>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-success" onClick={exportSupplierCsv}>
                                    <i className="ri-file-excel-2-line me-1" />CSV
                                </button>
                                <button type="button" className="btn btn-sm btn-success" onClick={exportSupplierXlsx}>
                                    <i className="ri-file-excel-2-line me-1" />Excel
                                </button>
                                <button type="button" className="btn btn-sm btn-danger" onClick={exportSupplierPdf}>
                                    <i className="ri-file-pdf-line me-1" />PDF
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
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
                        </div>{/* /card-body Estado Cuenta */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexApReports;
