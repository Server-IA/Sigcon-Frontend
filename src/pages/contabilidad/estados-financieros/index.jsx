import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Estados Financieros (CG).
 * Permite generar Balance General, Estado de Resultados y Flujo de Efectivo.
 * Llama a POST /api/v1/cg/statements/{type} con {year, month}.
 */

/** Formatea valores monetarios en formato colombiano (0 => $ 0). */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(val));
};

/** Genera opciones de anios (ultimos 5 anios + 1 futuro). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= current - 5; y--) {
        years.push(y);
    }
    return years;
};

/** Tipos de estado financiero. */
const STATEMENT_TYPES = [
    { id: 'balance-general',      label: 'Balance General',       icon: 'ri-scales-3-line' },
    { id: 'estado-resultados',    label: 'Estado de Resultados',  icon: 'ri-line-chart-line' },
    { id: 'flujo-efectivo',       label: 'Flujo de Efectivo',     icon: 'ri-money-dollar-circle-line' },
    // QA Bloque BP (HU-CG-18): cuarto estado financiero NIC 1.
    { id: 'cambios-patrimonio',   label: 'Cambios en el Patrimonio', icon: 'ri-bank-line' },
    // QA Bloque BP (HU-CG-13): balance comparativo entre dos periodos.
    { id: 'comparativo',          label: 'Comparativo',           icon: 'ri-arrow-left-right-line' },
];

const CgEstadosFinancieros = () => {
    const [year, setYear]               = useState(new Date().getFullYear());
    const [month, setMonth]             = useState(new Date().getMonth() + 1);
    // QA Bloque BP (HU-CG-13): segundo periodo para comparativo
    const [year2, setYear2]             = useState(new Date().getFullYear());
    const [month2, setMonth2]           = useState(Math.max(1, new Date().getMonth()));
    // HU-CG-13 E1: tercer periodo OPCIONAL para comparativo (hasta 3 periodos)
    const [use3Periods, setUse3Periods] = useState(false);
    const [year3, setYear3]             = useState(new Date().getFullYear());
    const [month3, setMonth3]           = useState(Math.max(1, new Date().getMonth() - 1));
    const [activeType, setActiveType]   = useState('balance-general');
    const [statementData, setStatementData] = useState(null);
    const [loading, setLoading]         = useState(false);
    const [generated, setGenerated]     = useState(false);
    const [message, setMessage]         = useState({ message: '', type: '', show: false });

    /** Genera el estado financiero seleccionado. */
    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(false);
        setStatementData(null);
        try {
            const payload = activeType === 'comparativo'
                ? {
                    year1: year, month1: month, year2: year2, month2: month2,
                    ...(use3Periods ? { year3, month3 } : {}),
                  }
                : { year, month };
            const { data, error } = await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'statements', activeType]),
                payload, {}, 1000, true
            );
            if (!error) {
                setStatementData(data);
                setGenerated(true);
            } else {
                setMessage({ type: 'danger', show: true, message: 'Error al generar el estado financiero.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al generar el estado financiero.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * QA Bloque BP (HU-CG-09 E5 / HU-CG-10 E5 / HU-CG-11 E4 / HU-CG-13 E4 /
     * HU-CG-18): descarga el estado financiero en PDF/XLSX/CSV. La url final
     * es /api/v1/cg/statements/<type>/export/<format>?year=...&month=...
     * (comparativo recibe year1/month1/year2/month2).
     */
    const handleExport = async (format) => {
        try {
            const token = localStorage.getItem('token');
            let url;
            if (activeType === 'comparativo') {
                url = base_url(['api', 'v1', 'cg', 'statements', 'comparativo', 'export', format])
                    + `?year1=${year}&month1=${month}&year2=${year2}&month2=${month2}`
                    + (use3Periods ? `&year3=${year3}&month3=${month3}` : '');
            } else {
                url = base_url(['api', 'v1', 'cg', 'statements', activeType, 'export', format])
                    + `?year=${year}&month=${month}`;
            }
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
            const stamp = activeType === 'comparativo'
                ? `${year}-${String(month).padStart(2, '0')}_vs_${year2}-${String(month2).padStart(2, '0')}`
                : `${year}-${String(month).padStart(2, '0')}`;
            a.download = `${activeType}-${stamp}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({
                type: 'danger', show: true,
                message: err?.message || 'No se pudo exportar el estado financiero.',
            });
        }
    };

    /** Card resumen reutilizable para totales arriba de cada estado. */
    const SummaryCard = ({ label, value, color = 'primary', icon }) => (
        <div className="col-md-3 col-sm-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <p className="text-muted mb-1 small">{label}</p>
                            <h5 className="fw-bold mb-0">{formatCurrency(value)}</h5>
                        </div>
                        {icon && (
                            <div className={`avatar avatar-sm bg-label-${color} rounded-circle d-flex align-items-center justify-content-center`}
                                 style={{ width: 40, height: 40 }}>
                                <i className={`${icon} text-${color}`} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    /** Renderiza detalle por clase contable (reutilizado por BG y ER). */
    const renderClassDetails = (details) => {
        if (!Array.isArray(details) || details.length === 0) {
            return (
                <div className="alert alert-info text-center">
                    <i className="ri-information-line me-1" />Sin movimientos registrados en el periodo.
                </div>
            );
        }
        return details.map((section, sIdx) => (
            <div key={sIdx} className="mb-4">
                <h6 className="fw-bold text-primary mb-2">
                    <i className="ri-folder-2-line me-1" />{section.className}
                </h6>
                <table className="table table-bordered table-sm mb-0">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: 120 }}>Codigo PUC</th>
                            <th>Cuenta</th>
                            <th className="text-end" style={{ width: 180 }}>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(section.accounts || []).map((a, idx) => (
                            <tr key={idx}>
                                <td><code>{a.pucCode || '-'}</code></td>
                                <td>{a.accountName || '-'}</td>
                                <td className="text-end">{formatCurrency(a.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                        <tr>
                            <td colSpan="2" className="text-end">Total {section.className}</td>
                            <td className="text-end">{formatCurrency(section.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        ));
    };

    /** Balance General. */
    const renderBalanceGeneral = (d) => (
        <>
            <div className="row">
                <SummaryCard label="Total Activos"    value={d.totalActivos}    color="success" icon="ri-wallet-3-line" />
                <SummaryCard label="Total Pasivos"    value={d.totalPasivos}    color="warning" icon="ri-exchange-dollar-line" />
                <SummaryCard label="Total Patrimonio" value={d.totalPatrimonio} color="info"    icon="ri-bank-line" />
                <div className="col-md-3 col-sm-6 mb-3">
                    <div className={`card border-0 shadow-sm h-100 ${d.isBalanced ? 'bg-label-success' : 'bg-label-danger'}`}>
                        <div className="card-body text-center">
                            <p className="text-muted mb-1 small">Ecuacion Contable</p>
                            <h5 className="fw-bold mb-0">
                                <i className={`${d.isBalanced ? 'ri-check-double-line' : 'ri-error-warning-line'} me-1`} />
                                {d.isBalanced ? 'Balanceado' : 'Desbalanceado'}
                            </h5>
                            <p className="text-muted small mb-0 mt-1">Activos = Pasivos + Patrimonio</p>
                        </div>
                    </div>
                </div>
            </div>
            {renderClassDetails(d.details)}
        </>
    );

    /** Estado de Resultados. */
    const renderEstadoResultados = (d) => (
        <>
            <div className="row">
                <SummaryCard label="Total Ingresos" value={d.totalIngresos} color="success" icon="ri-arrow-up-circle-line" />
                <SummaryCard label="Total Costos"   value={d.totalCostos}   color="warning" icon="ri-shopping-cart-line" />
                <SummaryCard label="Total Gastos"   value={d.totalGastos}   color="danger"  icon="ri-arrow-down-circle-line" />
                <SummaryCard label="Utilidad Bruta" value={d.utilidadBruta} color="info"    icon="ri-funds-line" />
            </div>
            <div className="row mb-3">
                <div className="col-md-12">
                    <div className={`card border-0 shadow-sm ${Number(d.utilidadNeta) >= 0 ? 'bg-label-success' : 'bg-label-danger'}`}>
                        <div className="card-body text-center">
                            <p className="text-muted mb-1 small">Utilidad Neta del Periodo</p>
                            <h3 className="fw-bold mb-0">{formatCurrency(d.utilidadNeta)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            {renderClassDetails(d.details)}
        </>
    );

    /** Flujo de Efectivo. */
    const renderFlujoEfectivo = (d) => (
        <>
            <div className="row">
                <SummaryCard label="Flujo Operativo"     value={d.flujoOperativo}     color="success" icon="ri-briefcase-line" />
                <SummaryCard label="Flujo Inversion"     value={d.flujoInversion}     color="warning" icon="ri-line-chart-line" />
                <SummaryCard label="Flujo Financiacion"  value={d.flujoFinanciacion}  color="info"    icon="ri-bank-card-line" />
                <SummaryCard label="Flujo Neto"          value={d.flujoNeto}          color="primary" icon="ri-exchange-funds-line" />
            </div>
            {/* HU-CG-11 E2: conciliacion de efectivo NIC 7 (saldo inicial + flujo neto = saldo final) */}
            {(d.saldoInicialEfectivo !== undefined && d.saldoInicialEfectivo !== null) && (
                <div className="row mb-3">
                    <SummaryCard label="Efectivo Inicial" value={d.saldoInicialEfectivo} color="secondary" icon="ri-history-line" />
                    <SummaryCard label="Efectivo Final"   value={d.saldoFinalEfectivo}   color="primary"   icon="ri-safe-2-line" />
                    <div className="col-md-6 col-sm-12 mb-3">
                        <div className={`card border-0 shadow-sm h-100 ${d.conciliado ? 'bg-label-success' : 'bg-label-danger'}`}>
                            <div className="card-body text-center">
                                <p className="text-muted mb-1 small">Conciliacion de efectivo</p>
                                <h5 className="fw-bold mb-0">
                                    <i className={`${d.conciliado ? 'ri-check-double-line' : 'ri-error-warning-line'} me-1`} />
                                    {d.conciliado ? 'Conciliado' : 'No concilia'}
                                </h5>
                                <p className="text-muted small mb-0 mt-1">Efectivo inicial + Flujo neto = Efectivo final</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {Array.isArray(d.details) && d.details.length > 0 ? (
                d.details.map((act, idx) => (
                    <div key={idx} className="mb-4">
                        <h6 className="fw-bold text-primary mb-2">
                            <i className="ri-folder-2-line me-1" />{act.activityType}
                        </h6>
                        <table className="table table-bordered table-sm mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Descripcion</th>
                                    <th style={{ width: 110 }}>Origen</th>
                                    <th className="text-end" style={{ width: 140 }}>Debito</th>
                                    <th className="text-end" style={{ width: 140 }}>Credito</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(act.entries || []).map((e, eIdx) => (
                                    <tr key={eIdx}>
                                        <td>{e.description || '-'}</td>
                                        <td><span className="badge bg-label-secondary">{e.sourceModule || '-'}</span></td>
                                        <td className="text-end">{formatCurrency(e.totalDebit)}</td>
                                        <td className="text-end">{formatCurrency(e.totalCredit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="table-light fw-bold">
                                <tr>
                                    <td colSpan="3" className="text-end">Flujo neto {act.activityType}</td>
                                    <td className="text-end">{formatCurrency(act.netFlow)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ))
            ) : (
                <div className="alert alert-info text-center">
                    <i className="ri-information-line me-1" />Sin movimientos registrados en el periodo.
                </div>
            )}
        </>
    );

    /** QA Bloque BP (HU-CG-18): renderiza Estado de Cambios en el Patrimonio. */
    const renderCambiosPatrimonio = (d) => (
        <>
            <div className="row">
                <SummaryCard label="Saldo Inicial"     value={d.saldoInicial}     color="primary" icon="ri-history-line" />
                <SummaryCard label="Aportes"           value={d.aportes}          color="success" icon="ri-coins-line" />
                <SummaryCard label="Utilidad Neta"     value={d.utilidadNeta}     color="info"    icon="ri-line-chart-line" />
                <SummaryCard label="Saldo Final"       value={d.saldoFinal}       color="warning" icon="ri-bank-line" />
            </div>
            <div className="row mb-3">
                <SummaryCard label="Reservas"             value={d.reservas}             color="info"    icon="ri-archive-line" />
                <SummaryCard label="Resultados Acumulados" value={d.resultadosAcumulados} color="primary" icon="ri-stack-line" />
                <SummaryCard label="Dividendos"           value={d.dividendosDecretados} color="warning" icon="ri-arrow-down-line" />
                <SummaryCard label="Otros movimientos"    value={d.otrosMovimientos}     color="secondary" icon="ri-exchange-line" />
            </div>
            <table className="table table-bordered table-sm">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: 120 }}>Codigo PUC</th>
                        <th>Cuenta</th>
                        <th className="text-end" style={{ width: 140 }}>Saldo Inicial</th>
                        <th className="text-end" style={{ width: 140 }}>Debito</th>
                        <th className="text-end" style={{ width: 140 }}>Credito</th>
                        <th className="text-end" style={{ width: 140 }}>Saldo Final</th>
                    </tr>
                </thead>
                <tbody>
                    {(d.details || []).map((row, idx) => (
                        <tr key={idx}>
                            <td><code>{row.pucCode || '-'}</code></td>
                            <td>{row.accountName || '-'}</td>
                            <td className="text-end">{formatCurrency(row.saldoInicial)}</td>
                            <td className="text-end">{formatCurrency(row.movimientosDebito)}</td>
                            <td className="text-end">{formatCurrency(row.movimientosCredito)}</td>
                            <td className="text-end">{formatCurrency(row.saldoFinal)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    /**
     * QA Bloque BP/BR (HU-CG-13): renderiza Balance Comparativo entre 2 o 3 periodos.
     * E1: soporta tercer periodo. E3: resalta en rojo+negrita las variaciones
     * porcentuales que superan +/-10% (umbral de variacion significativa).
     */
    const renderComparativo = (d) => {
        const rows = Array.isArray(d) ? d : [];
        const has3 = rows.some(r => r.period3Value !== undefined && r.period3Value !== null);
        // E3: celda de variacion % con resaltado si supera +/-10%.
        const pctCell = (val) => {
            const v = Number(val || 0);
            const exceeds = Math.abs(v) > 10;
            return (
                <td className={`text-end ${exceeds ? 'fw-bold text-danger' : ''}`}>
                    {exceeds && <i className="ri-alert-line me-1" />}{v.toFixed(2)}%
                </td>
            );
        };
        return (
            <>
                <div className="alert alert-light border small mb-2">
                    <i className="ri-information-line me-1" />
                    Las variaciones superiores a <strong>±10%</strong> se resaltan en rojo.
                </div>
                <table className="table table-bordered table-sm">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: 140 }}>Clase</th>
                            <th className="text-end">{rows[0]?.period1Label || 'Periodo A'}</th>
                            <th className="text-end">{rows[0]?.period2Label || 'Periodo B'}</th>
                            <th className="text-end">Var. Abs. A-B</th>
                            <th className="text-end">Var. % A-B</th>
                            {has3 && <th className="text-end">{rows[0]?.period3Label || 'Periodo C'}</th>}
                            {has3 && <th className="text-end">Var. Abs. B-C</th>}
                            {has3 && <th className="text-end">Var. % B-C</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                <td className="fw-bold">{row.className}</td>
                                <td className="text-end">{formatCurrency(row.period1Value)}</td>
                                <td className="text-end">{formatCurrency(row.period2Value)}</td>
                                <td className="text-end">{formatCurrency(row.variacionAbsoluta)}</td>
                                {pctCell(row.variacionPorcentual)}
                                {has3 && <td className="text-end">{formatCurrency(row.period3Value)}</td>}
                                {has3 && <td className="text-end">{formatCurrency(row.variacionAbsoluta2)}</td>}
                                {has3 && pctCell(row.variacionPorcentual2)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>
        );
    };

    /** Renderiza los datos del estado financiero segun el tipo activo. */
    const renderStatementTable = () => {
        if (!statementData) return null;
        const d = statementData?.data || statementData;
        if (!d || typeof d !== 'object') return null;

        switch (activeType) {
            case 'balance-general':     return renderBalanceGeneral(d);
            case 'estado-resultados':   return renderEstadoResultados(d);
            case 'flujo-efectivo':      return renderFlujoEfectivo(d);
            case 'cambios-patrimonio':  return renderCambiosPatrimonio(d);
            case 'comparativo':         return renderComparativo(d);
            default: return null;
        }
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Estados Financieros</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Selector de tipo */}
                <div className="d-flex gap-2 mb-4 flex-wrap">
                    {STATEMENT_TYPES.map(st => (
                        <button
                            key={st.id}
                            className={`btn ${activeType === st.id ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setActiveType(st.id); setGenerated(false); setStatementData(null); }}
                        >
                            <i className={`${st.icon} me-1`} />{st.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className="row mb-2">
                    <div className="col-md-3 mb-2">
                        <label className="form-label">
                            {activeType === 'comparativo' ? 'Año A' : 'Año'}
                        </label>
                        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 mb-2">
                        <label className="form-label">
                            {activeType === 'comparativo' ? 'Mes A' : 'Mes'}
                        </label>
                        <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>
                                    {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    {activeType === 'comparativo' && (
                        <>
                            <div className="col-md-3 mb-2">
                                <label className="form-label">Año B</label>
                                <select className="form-select" value={year2} onChange={e => setYear2(Number(e.target.value))}>
                                    {getYearOptions().map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label">Mes B</label>
                                <select className="form-select" value={month2} onChange={e => setMonth2(Number(e.target.value))}>
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                        <option key={m} value={m}>
                                            {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* HU-CG-13 E1: tercer periodo opcional */}
                            <div className="col-md-3 mb-2 d-flex align-items-end">
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="use3Periods"
                                           checked={use3Periods} onChange={e => setUse3Periods(e.target.checked)} />
                                    <label className="form-check-label" htmlFor="use3Periods">
                                        Comparar un 3er periodo
                                    </label>
                                </div>
                            </div>
                            {use3Periods && (
                                <>
                                    <div className="col-md-3 mb-2">
                                        <label className="form-label">Año C</label>
                                        <select className="form-select" value={year3} onChange={e => setYear3(Number(e.target.value))}>
                                            {getYearOptions().map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3 mb-2">
                                        <label className="form-label">Mes C</label>
                                        <select className="form-select" value={month3} onChange={e => setMonth3(Number(e.target.value))}>
                                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                                <option key={m} value={m}>
                                                    {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
                {/* Acciones */}
                <div className="row mb-4">
                    <div className="col-12 d-flex flex-wrap gap-2">
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            ) : (
                                <><i className="ri-file-chart-line me-1" />Generar</>
                            )}
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => handleExport('pdf')}
                                disabled={!generated || !statementData}>
                            <i className="ri-file-pdf-line me-1" />Exportar PDF
                        </button>
                        <button className="btn btn-outline-success" onClick={() => handleExport('xlsx')}
                                disabled={!generated || !statementData}>
                            <i className="ri-file-excel-2-line me-1" />Exportar Excel
                        </button>
                        <button className="btn btn-outline-secondary" onClick={() => handleExport('csv')}
                                disabled={!generated || !statementData}>
                            <i className="ri-file-text-line me-1" />Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Titulo del estado financiero generado */}
                {generated && (
                    <div className="mb-3">
                        <h6 className="fw-bold">
                            {STATEMENT_TYPES.find(s => s.id === activeType)?.label} - {year}/{String(month).padStart(2, '0')}
                        </h6>
                        <hr />
                    </div>
                )}

                {/* Resultados */}
                {generated && statementData && (
                    <div>
                        {renderStatementTable()}
                    </div>
                )}

                {generated && !statementData && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-file-search-line ri-2x mb-2 d-block" />
                        No se encontraron datos para generar el estado financiero.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgEstadosFinancieros;
