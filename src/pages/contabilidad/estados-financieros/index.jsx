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
];

const CgEstadosFinancieros = () => {
    const [year, setYear]               = useState(new Date().getFullYear());
    const [month, setMonth]             = useState(new Date().getMonth() + 1);
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
            const { data, error } = await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'statements', activeType]),
                { year, month }, {}, 1000, true
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

    /** Renderiza los datos del estado financiero segun el tipo activo. */
    const renderStatementTable = () => {
        if (!statementData) return null;
        const d = statementData?.data || statementData;
        if (!d || typeof d !== 'object') return null;

        switch (activeType) {
            case 'balance-general':   return renderBalanceGeneral(d);
            case 'estado-resultados': return renderEstadoResultados(d);
            case 'flujo-efectivo':    return renderFlujoEfectivo(d);
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
                <div className="row mb-4">
                    <div className="col-md-3 mb-2">
                        <label className="form-label">Año</label>
                        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 mb-2">
                        <label className="form-label">Mes</label>
                        <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>
                                    {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 mb-2 d-flex align-items-end">
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            ) : (
                                <><i className="ri-file-chart-line me-1" />Generar</>
                            )}
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
