import { useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

/**
 * Pagina de Reportes Tributarios (CG - HU-CG-12).
 *
 * <p>Cubre el reporte consolidado de impuestos y retenciones que sirve de
 * insumo para los formularios DIAN 300 (IVA bimestral) y 350 (Retenciones
 * en la fuente). El backend expone:</p>
 * <ul>
 *   <li>GET /api/v1/cg/tax-reports/taxes-summary?year=2026</li>
 *   <li>GET /api/v1/cg/tax-reports/iva?year=2026&bimester=1..6</li>
 *   <li>GET /api/v1/cg/tax-reports/ecl?year=2026</li>
 *   <li>GET /api/v1/cg/tax-reports/exchange-differences?year=2026&month=1..12</li>
 * </ul>
 *
 * <p>QA Bloque BP (2026-05-19, HU-CG-12 E2): export CSV/XLSX del Resumen
 * anual (Formulario 350) via /taxes-summary/export/{format}.</p>
 */

const fmt = (n) => {
    if (n === null || n === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP',
        minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(Number(n));
};

const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= current - 5; y--) years.push(y);
    return years;
};

const REPORT_TYPES = [
    { id: 'taxes-summary',        label: 'Resumen Anual',          icon: 'ri-pie-chart-line' },
    { id: 'iva',                  label: 'IVA Bimestral',          icon: 'ri-scales-line' },
    { id: 'ecl',                  label: 'ECL Cartera (NIIF 9)',   icon: 'ri-error-warning-line' },
    { id: 'exchange-differences', label: 'Diferencias en Cambio',  icon: 'ri-exchange-line' },
];

const CgReportesTributarios = () => {
    const [activeType, setActiveType] = useState('taxes-summary');
    const [year, setYear]             = useState(new Date().getFullYear());
    const [month, setMonth]           = useState(new Date().getMonth() + 1);
    const [bimester, setBimester]     = useState(1);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading]       = useState(false);
    const [message, setMessage]       = useState({ message: '', type: '', show: false });

    const handleGenerate = async () => {
        setLoading(true);
        setReportData(null);
        try {
            let url;
            if (activeType === 'taxes-summary' || activeType === 'ecl') {
                url = base_url(['api', 'v1', 'cg', 'tax-reports', activeType])
                    + `?year=${year}`;
            } else if (activeType === 'iva') {
                url = base_url(['api', 'v1', 'cg', 'tax-reports', 'iva'])
                    + `?year=${year}&bimester=${bimester}`;
            } else {
                url = base_url(['api', 'v1', 'cg', 'tax-reports', 'exchange-differences'])
                    + `?year=${year}&month=${month}`;
            }
            const resp = await fetchHelper.get(url, {}, 0);
            // fetchHelper.get retorna SuccessRespondJson wrappeado: { msg, data }
            const payload = resp?.data?.data || resp?.data || resp;
            setReportData(payload);
            setMessage({ type: 'success', show: true, message: 'Reporte generado correctamente.' });
        } catch (err) {
            setMessage({ type: 'danger', show: true,
                message: err?.msg || err?.message || 'Error al generar el reporte.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * QA Bloque BR (HU-CG-12 E2): exporta el reporte tributario ACTIVO en
     * CSV/XLSX/PDF via el endpoint generico /tax-reports/{type}/export/{format}.
     * Antes solo el Resumen Anual exportaba (CSV/XLSX); ahora los 4 sub-reportes
     * exportan en los 3 formatos.
     */
    const handleExport = async (format) => {
        try {
            const token = localStorage.getItem('token');
            let qs = `?year=${year}`;
            if (activeType === 'iva') qs += `&bimester=${bimester}`;
            if (activeType === 'exchange-differences') qs += `&month=${month}`;
            const url = base_url(['api', 'v1', 'cg', 'tax-reports', activeType, 'export', format]) + qs;
            const resp = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || 'Error descargando archivo');
            }
            const blob = await resp.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const stamp = activeType === 'iva' ? `${year}-B${bimester}`
                : activeType === 'exchange-differences' ? `${year}-${String(month).padStart(2, '0')}`
                : `${year}`;
            a.download = `${activeType}_${stamp}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({ type: 'danger', show: true,
                message: err?.message || `Error al exportar ${format.toUpperCase()}.` });
        }
    };

    /** Renderiza Resumen Anual. */
    const renderTaxesSummary = (d) => (
        <>
            <div className="row mb-3">
                <SummaryCard label="IVA Generado"      value={d.totalIvaGenerado}        color="success" />
                <SummaryCard label="IVA Descontable"   value={d.totalIvaDescontable}     color="info" />
                <SummaryCard label="Saldo IVA Anual"   value={d.saldoIvaAnual}           color="primary" />
                <SummaryCard label="Retenciones Practicadas" value={d.totalRetencionesPracticadas} color="warning" />
            </div>
            <table className="table table-striped table-sm">
                <thead className="table-light">
                    <tr>
                        <th>Mes</th>
                        <th className="text-end">IVA Generado</th>
                        <th className="text-end">IVA Descontable</th>
                        <th className="text-end">Saldo IVA</th>
                        <th className="text-end">Ret. Practicadas</th>
                        <th className="text-end">Ret. Soportadas</th>
                    </tr>
                </thead>
                <tbody>
                    {(d.monthlySummary || []).map((m, i) => (
                        <tr key={i}>
                            <td>{m.monthLabel}</td>
                            <td className="text-end">{fmt(m.ivaGenerado)}</td>
                            <td className="text-end">{fmt(m.ivaDescontable)}</td>
                            <td className="text-end">{fmt(m.saldoIva)}</td>
                            <td className="text-end">{fmt(m.retencionesPracticadas)}</td>
                            <td className="text-end">{fmt(m.retencionesSoportadas)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="table-light fw-bold">
                    <tr>
                        <td>TOTAL ANUAL</td>
                        <td className="text-end">{fmt(d.totalIvaGenerado)}</td>
                        <td className="text-end">{fmt(d.totalIvaDescontable)}</td>
                        <td className="text-end">{fmt(d.saldoIvaAnual)}</td>
                        <td className="text-end">{fmt(d.totalRetencionesPracticadas)}</td>
                        <td className="text-end">{fmt(d.totalRetencionesSoportadas)}</td>
                    </tr>
                </tfoot>
            </table>
        </>
    );

    /** Renderiza IVA bimestral. */
    const renderIva = (d) => (
        <div className="row">
            <SummaryCard label="IVA Generado"     value={d.ivaGenerado}      color="success" />
            <SummaryCard label="IVA Descontable"  value={d.ivaDescontable}   color="info" />
            <SummaryCard label={`Saldo (${d.saldoTipo})`} value={d.saldoIva} color="warning" />
            <SummaryCard label={`Bimestre ${d.bimester} - ${d.bimesterLabel}`} value={d.countFacturasVenta + d.countFacturasCompra} color="primary" plain />
        </div>
    );

    /** Renderiza ECL. */
    const renderEcl = (d) => (
        <>
            <div className="row mb-3">
                <SummaryCard label="Cartera Total" value={d.totalCartera}   color="primary" />
                <SummaryCard label="Provision ECL" value={d.totalProvision} color="warning" />
            </div>
            <table className="table table-bordered table-sm">
                <thead className="table-light">
                    <tr>
                        <th>Tramo</th>
                        <th className="text-end">Saldo Total</th>
                        <th className="text-end">% ECL</th>
                        <th className="text-end">Provision</th>
                    </tr>
                </thead>
                <tbody>
                    {(d.buckets || []).map((b, i) => (
                        <tr key={i}>
                            <td>{b.label}</td>
                            <td className="text-end">{fmt(b.totalBalance)}</td>
                            <td className="text-end">{Number(b.eclRate || 0) * 100}%</td>
                            <td className="text-end">{fmt(b.eclAmount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    /** Renderiza diferencias en cambio. */
    const renderExchange = (d) => (
        <>
            <div className="row mb-3">
                <SummaryCard label="Ganancia"        value={d.totalGanancia}    color="success" />
                <SummaryCard label="Perdida"         value={d.totalPerdida}     color="danger" />
                <SummaryCard label="Diferencia Neta" value={d.diferenciaNeta}   color="primary" />
            </div>
            <table className="table table-sm">
                <thead className="table-light">
                    <tr>
                        <th>Documento</th>
                        <th>Tipo</th>
                        <th>Moneda</th>
                        <th className="text-end">Monto Extr.</th>
                        <th className="text-end">Tasa Original</th>
                        <th className="text-end">Tasa Actual</th>
                        <th className="text-end">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    {(d.items || []).map((it, i) => (
                        <tr key={i}>
                            <td>{it.invoiceNumber}</td>
                            <td>{it.documentType}</td>
                            <td>{it.currency}</td>
                            <td className="text-end">{Number(it.amountForeign || 0).toFixed(2)}</td>
                            <td className="text-end">{Number(it.originalRate || 0).toFixed(2)}</td>
                            <td className="text-end">{Number(it.currentRate || 0).toFixed(2)}</td>
                            <td className={`text-end ${it.type === 'GANANCIA' ? 'text-success' : 'text-danger'}`}>
                                {fmt(it.differenceAmount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    const SummaryCard = ({ label, value, color = 'primary', plain = false }) => (
        <div className="col-md-3 col-sm-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                    <p className="text-muted mb-1 small">{label}</p>
                    <h5 className={`fw-bold mb-0 text-${color}`}>
                        {plain ? value : fmt(value)}
                    </h5>
                </div>
            </div>
        </div>
    );

    const renderReport = () => {
        if (!reportData) return null;
        switch (activeType) {
            case 'taxes-summary':        return renderTaxesSummary(reportData);
            case 'iva':                  return renderIva(reportData);
            case 'ecl':                  return renderEcl(reportData);
            case 'exchange-differences': return renderExchange(reportData);
            default: return null;
        }
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Reportes Tributarios</h5>
            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />
            <div className="card-body">
                {/* Selector de tipo */}
                <div className="d-flex gap-2 mb-4 flex-wrap">
                    {REPORT_TYPES.map(r => (
                        <button
                            key={r.id}
                            className={`btn ${activeType === r.id ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setActiveType(r.id); setReportData(null); }}
                        >
                            <i className={`${r.icon} me-1`} />{r.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className="row mb-3">
                    <div className="col-md-3 mb-2">
                        <label className="form-label">Año</label>
                        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {activeType === 'iva' && (
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Bimestre</label>
                            <select className="form-select" value={bimester}
                                    onChange={e => setBimester(Number(e.target.value))}>
                                {[1,2,3,4,5,6].map(b => (
                                    <option key={b} value={b}>Bimestre {b}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {activeType === 'exchange-differences' && (
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Mes</label>
                            <select className="form-select" value={month}
                                    onChange={e => setMonth(Number(e.target.value))}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="col-md-6 mb-2 d-flex align-items-end gap-2 flex-wrap">
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            ) : (
                                <><i className="ri-file-chart-line me-1" />Generar</>
                            )}
                        </button>
                        {reportData && (
                            <>
                                <button className="btn btn-outline-danger" onClick={() => handleExport('pdf')}>
                                    <i className="ri-file-pdf-line me-1" />PDF
                                </button>
                                <button className="btn btn-outline-success" onClick={() => handleExport('xlsx')}>
                                    <i className="ri-file-excel-2-line me-1" />Excel
                                </button>
                                <button className="btn btn-outline-secondary" onClick={() => handleExport('csv')}>
                                    <i className="ri-file-text-line me-1" />CSV
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Resultado */}
                {reportData && (
                    <div>
                        <h6 className="fw-bold mb-3">
                            {REPORT_TYPES.find(r => r.id === activeType)?.label} - {year}
                        </h6>
                        <hr />
                        {renderReport()}
                    </div>
                )}

                {!reportData && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-bar-chart-2-line ri-2x mb-2 d-block" />
                        Seleccione tipo y año, luego presione "Generar".
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgReportesTributarios;
