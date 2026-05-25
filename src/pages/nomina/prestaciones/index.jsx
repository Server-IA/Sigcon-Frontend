import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-05: liquidacion de prestaciones sociales.
 *
 * <p>UI unificada para los 3 escenarios:
 * <ul>
 *   <li>Cesantías e intereses anuales (CST Art. 249, Ley 52/1975)</li>
 *   <li>Prima de servicios semestral (CST Art. 306)</li>
 *   <li>Liquidación definitiva de contrato (CST Art. 64)</li>
 * </ul>
 */
const fmt = (n) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

// HU-NOM-05 DEF#1 (2026-04-28): traduccion de claves del backend al espaniol.
const FIELD_LABELS = {
    employeeId: 'ID Empleado',
    employeeName: 'Empleado',
    year: 'Año',
    semester: 'Semestre',
    daysWorked: 'Días trabajados',
    totalDays: 'Días totales',
    baseSalary: 'Salario base',
    severance: 'Cesantías',
    interest: 'Intereses cesantías',
    bonus: 'Prima',
    serviceBonus: 'Prima de servicios',
    proportionalBonus: 'Prima proporcional',
    pendingSeverance: 'Cesantías pendientes',
    vacationCompensation: 'Vacaciones compensadas',
    indemnity: 'Indemnización Art. 64',
    // QA Nomina (2026-05-25) ERR-NOM-006: el backend devuelve la indemnizacion
    // en la clave `severancePay`, no `indemnity`. Sin esta etiqueta el campo
    // salia con el nombre crudo "severancePay" y el contador no lo reconocia.
    severancePay: 'Indemnización Art. 64',
    severanceInterest: 'Intereses cesantías',
    totalPayable: 'Total a pagar',
    journalEntryId: 'Comprobante (JE #)',
    terminationType: 'Tipo terminación',
    terminationDate: 'Fecha retiro',
    period: 'Período',
};

const labelFor = (k) => FIELD_LABELS[k] || k;

const IndexPrestaciones = () => {
    const now = new Date();
    const [tab, setTab] = useState('cesantias');
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [result, setResult] = useState(null);
    const [resultType, setResultType] = useState(null); // 'cesantias' | 'prima' | 'liquidacion'
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);

    // HU-NOM-05 DEF#3 + Imagen 2 (2026-04-28): al cambiar de tab limpiar el
    // resultado anterior. Antes el bloque "Resultado" mostraba la liquidacion
    // anterior aunque ya estuvieras en otro tab (confusion grave: "estoy en
    // liquidacion definitiva pero me muestra cesantias").
    useEffect(() => {
        setResult(null);
        setResultType(null);
    }, [tab]);

    // Cargar empleados para dropdown
    useEffect(() => {
        fetchHelper.post(base_url(['api', 'nomina', 'empleados', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 0)
            .then(resp => {
                const list = resp?.data ?? resp ?? [];
                const arr = Array.isArray(list) ? list : (list?.data || []);
                if (Array.isArray(arr)) {
                    setEmployees(arr.map(e => ({
                        id: e.id,
                        name: `${e.documentNumber || ''} - ${e.fullName || ''}`.trim(),
                    })));
                }
            })
            .catch(() => {});
    }, []);

    // Cesantias
    const [sevForm, setSevForm] = useState({ employeeId: '', year: now.getFullYear() });
    // Prima
    const [bonusForm, setBonusForm] = useState({
        employeeId: '', year: now.getFullYear(), semester: now.getMonth() <= 5 ? 1 : 2
    });
    // Liquidacion definitiva
    const [termForm, setTermForm] = useState({
        employeeId: '', terminationDate: new Date().toISOString().substring(0, 10),
        terminationType: 'SIN_JUSTA_CAUSA'
    });

    const liquidate = async (endpoint, params, kind) => {
        setLoading(true);
        setResult(null);
        try {
            const resp = await fetchHelper.post(
                    base_url(['api', 'nomina', 'prestaciones', endpoint], params),
                    {}, {}, 0);
            setResult(resp);
            setResultType(kind);
            setAlert({ show: true, type: 'success',
                message: `Liquidación calculada. JE #${resp.journalEntryId || '-'}` });
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err?.msg || err?.message || 'No se pudo liquidar.' });
        } finally {
            setLoading(false);
        }
    };

    const doCesantias = () => {
        if (!sevForm.employeeId) return setAlert({ show: true, type: 'warning', message: 'Ingrese ID de empleado' });
        liquidate('cesantias', { employeeId: Number(sevForm.employeeId), year: sevForm.year }, 'cesantias');
    };
    const doBonus = () => {
        if (!bonusForm.employeeId) return setAlert({ show: true, type: 'warning', message: 'Ingrese ID de empleado' });
        liquidate('prima', { employeeId: Number(bonusForm.employeeId), year: bonusForm.year, semester: bonusForm.semester }, 'prima');
    };
    const doTermination = () => {
        if (!termForm.employeeId) return setAlert({ show: true, type: 'warning', message: 'Ingrese ID de empleado' });
        liquidate('liquidacion-definitiva', {
            employeeId: Number(termForm.employeeId),
            terminationDate: termForm.terminationDate,
            terminationType: termForm.terminationType,
        }, 'liquidacion');
    };

    // HU-NOM-05 DEF#2 (2026-04-28): descargar comprobante de la liquidacion en PDF
    // via window.print. Cumple CST Art. 132 (cesantias/prima) y Art. 64 (definitiva).
    const downloadResultPdf = () => {
        if (!result) return;
        const titles = {
            cesantias: 'Liquidación de Cesantías e Intereses',
            prima: 'Liquidación de Prima de Servicios',
            liquidacion: 'Liquidación Definitiva de Contrato',
        };
        const title = titles[resultType] || 'Liquidación de Prestaciones';
        const popup = window.open('', '_blank');
        if (!popup) {
            setAlert({ show: true, type: 'warning',
                message: 'Habilite ventanas emergentes para exportar PDF.' });
            return;
        }
        const moneyKeys = new Set(['baseSalary','severance','interest','severanceInterest',
            'bonus','serviceBonus','proportionalBonus','pendingSeverance',
            'vacationCompensation','indemnity','severancePay','totalPayable']);
        const rows = Object.entries(result)
            .filter(([k]) => k !== 'legalRef')
            .map(([k, v]) => {
                const display = (typeof v === 'number' && moneyKeys.has(k)) ? fmt(v) : String(v ?? '-');
                return `<tr><td><b>${labelFor(k)}</b></td><td>${display}</td></tr>`;
            }).join('');
        popup.document.write(`<html><head><title>${title}</title>
            <style>body{font-family:Arial;padding:20px}h1{font-size:18px}
                table{width:100%;border-collapse:collapse;margin-top:14px}
                td{border:1px solid #999;padding:8px;font-size:12px}
                .ref{margin-top:14px;font-size:11px;color:#666}</style>
            </head><body onload="window.print()">
            <h1>${title}</h1>
            <p>Generado: ${new Date().toLocaleString('es-CO')}</p>
            <table>${rows}</table>
            ${result.legalRef ? `<div class="ref">📚 ${result.legalRef}</div>` : ''}
            </body></html>`);
        popup.document.close();
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-service-line me-2"></i>Prestaciones sociales
                <small className="d-block text-muted mt-1">
                    Cesantías, prima semestral y liquidación definitiva (HU-NOM-05)
                </small>
            </h5>
            <div className="card-body">
                <AlertPage type={alert.type} message={alert.message} show={alert.show}
                        onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                        <a className={`nav-link ${tab === 'cesantias' ? 'active' : ''}`}
                                onClick={() => setTab('cesantias')} style={{ cursor: 'pointer' }}>
                            <i className="ri-safe-line me-1"></i> Cesantías
                        </a>
                    </li>
                    <li className="nav-item">
                        <a className={`nav-link ${tab === 'prima' ? 'active' : ''}`}
                                onClick={() => setTab('prima')} style={{ cursor: 'pointer' }}>
                            <i className="ri-money-dollar-circle-line me-1"></i> Prima
                        </a>
                    </li>
                    <li className="nav-item">
                        <a className={`nav-link ${tab === 'liquidacion' ? 'active' : ''}`}
                                onClick={() => setTab('liquidacion')} style={{ cursor: 'pointer' }}>
                            <i className="ri-logout-box-line me-1"></i> Liquidación definitiva
                        </a>
                    </li>
                </ul>

                {tab === 'cesantias' && (
                    <div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-4">
                                <label className="form-label">Empleado</label>
                                <select className="form-select" value={sevForm.employeeId}
                                        onChange={e => setSevForm({ ...sevForm, employeeId: e.target.value })}>
                                    <option value="">Seleccione empleado</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Año</label>
                                <input type="number" className="form-control" value={sevForm.year}
                                        onChange={e => setSevForm({ ...sevForm, year: Number(e.target.value) })} />
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
                                <button className="btn btn-primary w-100" onClick={doCesantias} disabled={loading}>
                                    <i className="ri-calculator-line me-1"></i> Liquidar cesantías
                                </button>
                            </div>
                        </div>
                        <small className="text-muted">
                            <b>Cesantías</b> = salario × días_trabajados / 360.
                            <b> Intereses</b> = cesantías × 12% × días/360 (Ley 52/1975).
                            Consignación antes del 15 de febrero (CST Art. 249).
                        </small>
                    </div>
                )}

                {tab === 'prima' && (
                    <div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-4">
                                <label className="form-label">Empleado</label>
                                <select className="form-select" value={bonusForm.employeeId}
                                        onChange={e => setBonusForm({ ...bonusForm, employeeId: e.target.value })}>
                                    <option value="">Seleccione empleado</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Año</label>
                                <input type="number" className="form-control" value={bonusForm.year}
                                        onChange={e => setBonusForm({ ...bonusForm, year: Number(e.target.value) })} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Semestre</label>
                                <select className="form-select" value={bonusForm.semester}
                                        onChange={e => setBonusForm({ ...bonusForm, semester: Number(e.target.value) })}>
                                    <option value={1}>I (junio)</option>
                                    <option value={2}>II (diciembre)</option>
                                </select>
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
                                <button className="btn btn-primary w-100" onClick={doBonus} disabled={loading}>
                                    <i className="ri-calculator-line me-1"></i> Liquidar prima
                                </button>
                            </div>
                        </div>
                        <small className="text-muted">
                            <b>Prima</b> = salario × días_trabajados_semestre / 360.
                            Dos liquidaciones por año: 30 junio y 20 diciembre (CST Art. 306).
                        </small>
                    </div>
                )}

                {tab === 'liquidacion' && (
                    <div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-3">
                                <label className="form-label">Empleado</label>
                                <select className="form-select" value={termForm.employeeId}
                                        onChange={e => setTermForm({ ...termForm, employeeId: e.target.value })}>
                                    <option value="">Seleccione empleado</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Fecha de retiro</label>
                                <input type="date" className="form-control" value={termForm.terminationDate}
                                        onChange={e => setTermForm({ ...termForm, terminationDate: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Tipo terminación</label>
                                <select className="form-select" value={termForm.terminationType}
                                        onChange={e => setTermForm({ ...termForm, terminationType: e.target.value })}>
                                    <option value="SIN_JUSTA_CAUSA">Sin justa causa</option>
                                    <option value="JUSTA_CAUSA">Con justa causa</option>
                                    <option value="MUTUO_ACUERDO">Mutuo acuerdo</option>
                                    <option value="RENUNCIA">Renuncia</option>
                                </select>
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
                                <button className="btn btn-primary w-100" onClick={doTermination} disabled={loading}>
                                    <i className="ri-calculator-line me-1"></i> Liquidar contrato
                                </button>
                            </div>
                        </div>
                        <small className="text-muted">
                            Calcula <b>cesantías pendientes + intereses + prima proporcional + vacaciones compensadas
                            + indemnización</b> (CST Art. 64 - solo aplica si SIN_JUSTA_CAUSA + contrato INDEFINIDO).
                        </small>
                    </div>
                )}

                {result && (
                    <div className="mt-4 card bg-label-primary">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="card-title mb-0">
                                    Resultado de la liquidación
                                    {resultType === 'cesantias' && ' — Cesantías e Intereses'}
                                    {resultType === 'prima' && ' — Prima de Servicios'}
                                    {resultType === 'liquidacion' && ' — Liquidación Definitiva'}
                                </h6>
                                <button type="button" className="btn btn-sm btn-danger"
                                        onClick={downloadResultPdf}>
                                    <i className="ri-file-pdf-line me-1"></i> Descargar comprobante
                                </button>
                            </div>
                            <div className="row">
                                {Object.entries(result).filter(([k]) => !['legalRef'].includes(k)).map(([k, v]) => (
                                    <div className="col-md-6" key={k}>
                                        <strong>{labelFor(k)}:</strong>{' '}
                                        {typeof v === 'number' && k !== 'employeeId' && k !== 'journalEntryId'
                                                && k !== 'daysWorked' && k !== 'totalDays' && k !== 'year'
                                                && k !== 'semester'
                                            ? fmt(v) : String(v ?? '-')}
                                    </div>
                                ))}
                            </div>
                            {result.legalRef && (
                                <div className="mt-2 small text-muted">📚 {result.legalRef}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexPrestaciones;
