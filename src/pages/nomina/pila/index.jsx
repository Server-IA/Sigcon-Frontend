import { useState } from 'react';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-06 E2: Reporte PILA (Planilla Integrada de Liquidacion de Aportes)
 * exportable en CSV compatible con operadores de seguridad social.
 */
const IndexPila = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const download = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // HU-NOM-06 DEF#1 (2026-04-28): primero verificar si hay datos
            // del periodo. Antes la descarga generaba archivo vacio sin advertencia.
            const checkUrl = base_url(['api', 'nomina', 'recibos', 'search']);
            const checkResp = await fetch(checkUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    start: 0, length: 1, draw: 1,
                    columns: [
                        { data: 'periodYear', name: 'periodYear', searchable: true,
                          search: { value: String(year), regex: false } },
                        { data: 'periodMonth', name: 'periodMonth', searchable: true,
                          search: { value: String(month), regex: false } },
                    ],
                }),
            });
            const checkJson = await checkResp.json();
            const total = checkJson?.recordsFiltered ?? checkJson?.recordsTotal ?? 0;
            if (total === 0) {
                setAlert({ show: true, type: 'warning',
                    message: `No hay recibos APROBADOS o CERRADOS en ${year}-${String(month).padStart(2,'0')}. No se descarga el archivo.` });
                return;
            }

            const url = base_url(['api', 'nomina', 'reportes', 'pila'], { year, month });
            const resp = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = `pila-${year}-${String(month).padStart(2, '0')}.csv`;
            a.click();
            URL.revokeObjectURL(dlUrl);
            setAlert({ show: true, type: 'success',
                message: `CSV PILA descargado para ${year}-${String(month).padStart(2, '0')}` });
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err.message || 'No se pudo generar el CSV PILA.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-file-download-line me-2"></i>Reporte PILA
                <small className="d-block text-muted mt-1">
                    Planilla Integrada de Liquidación de Aportes (HU-NOM-06 E2)
                </small>
            </h5>
            <div className="card-body">
                <AlertPage type={alert.type} message={alert.message} show={alert.show}
                        onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="alert alert-info mb-3">
                    <i className="ri-information-line me-2"></i>
                    Genera un archivo CSV compatible con operadores PILA de seguridad social
                    (Decreto 1772/1994, Ley 100/1993). Solo incluye recibos en estado <b>APROBADO</b> o <b>CERRADO</b>
                    del periodo seleccionado.
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <label className="form-label">Año</label>
                        <input type="number" className="form-control" value={year}
                                onChange={e => setYear(Number(e.target.value))} />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Mes</label>
                        <select className="form-select" value={month}
                                onChange={e => setMonth(Number(e.target.value))}>
                            <option value={1}>01 - Enero</option>
                            <option value={2}>02 - Febrero</option>
                            <option value={3}>03 - Marzo</option>
                            <option value={4}>04 - Abril</option>
                            <option value={5}>05 - Mayo</option>
                            <option value={6}>06 - Junio</option>
                            <option value={7}>07 - Julio</option>
                            <option value={8}>08 - Agosto</option>
                            <option value={9}>09 - Septiembre</option>
                            <option value={10}>10 - Octubre</option>
                            <option value={11}>11 - Noviembre</option>
                            <option value={12}>12 - Diciembre</option>
                        </select>
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                        <button className="btn btn-primary w-100" onClick={download} disabled={loading}>
                            {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                            <i className="ri-download-line me-1"></i> Descargar CSV PILA
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <h6 className="text-uppercase text-muted small">Columnas del archivo</h6>
                    <ul className="small mb-0">
                        <li><code>NIT_EMPRESA</code>: NIT fiscal del empleador</li>
                        <li><code>DOC_EMPLEADO</code>: Número de documento del empleado</li>
                        <li><code>NOMBRE</code>: Nombre completo</li>
                        <li><code>IBC</code>: Ingreso Base de Cotización</li>
                        <li><code>SALUD_EMP_4</code>, <code>PENSION_EMP_4</code>: Aportes del empleado (4% c/u)</li>
                        <li><code>SALUD_EMPR_8_5</code>, <code>PENSION_EMPR_12</code>: Aportes empresa (8.5% / 12%)</li>
                        <li><code>SENA_2</code>, <code>ICBF_3</code>, <code>CAJA_4</code>: Parafiscales</li>
                        <li><code>TOTAL_APORTES</code>: Suma de todos los aportes del periodo</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default IndexPila;
