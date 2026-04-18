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

const IndexPrestaciones = () => {
    const now = new Date();
    const [tab, setTab] = useState('cesantias');
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);

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

    const liquidate = async (endpoint, params) => {
        setLoading(true);
        setResult(null);
        try {
            const resp = await fetchHelper.post(
                    base_url(['api', 'nomina', 'prestaciones', endpoint], params),
                    {}, {}, 0);
            setResult(resp);
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
        liquidate('cesantias', { employeeId: Number(sevForm.employeeId), year: sevForm.year });
    };
    const doBonus = () => {
        if (!bonusForm.employeeId) return setAlert({ show: true, type: 'warning', message: 'Ingrese ID de empleado' });
        liquidate('prima', { employeeId: Number(bonusForm.employeeId), year: bonusForm.year, semester: bonusForm.semester });
    };
    const doTermination = () => {
        if (!termForm.employeeId) return setAlert({ show: true, type: 'warning', message: 'Ingrese ID de empleado' });
        liquidate('liquidacion-definitiva', {
            employeeId: Number(termForm.employeeId),
            terminationDate: termForm.terminationDate,
            terminationType: termForm.terminationType,
        });
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
                            <h6 className="card-title">Resultado de la liquidación</h6>
                            <div className="row">
                                {Object.entries(result).filter(([k]) => !['legalRef'].includes(k)).map(([k, v]) => (
                                    <div className="col-md-6" key={k}>
                                        <strong>{k}:</strong>{' '}
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
