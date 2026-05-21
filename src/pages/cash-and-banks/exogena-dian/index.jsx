import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-079: información exógena DIAN (1647 movimientos bancarios, 1010 terceros,
 * 1011 información tributaria). Datos por año (solo sesiones CERRADAS), validación previa,
 * descarga CSV/XML + retención 10 años, e histórico de generaciones.
 * El archivo en estructura XML/XSD oficial DIAN es infraestructura diferida.
 */
const ExogenaDian = () => {
    const [formato, setFormato] = useState('1647');
    const [year, setYear] = useState(new Date().getFullYear());
    const [datos, setDatos] = useState(null);
    const [valid, setValid] = useState(null);
    const [hist, setHist] = useState([]);

    const eUrl = (...p) => base_url(['api', 'v1', 'banks', 'exogena', ...p]);

    useEffect(() => { cargarHistorico(); }, []);

    const cargarHistorico = async () => {
        try { setHist(await fetchHelper.get(eUrl('historico', 'list'), {}, 0, false, true) || []); }
        catch (_) { setHist([]); }
    };

    const verDatos = async () => {
        setDatos(null);
        try { setDatos(await fetchHelper.get(eUrl(formato) + `?ano=${year}`, {}, 0, true)); }
        catch (_) { /* */ }
    };

    const validar = async () => {
        setValid(null);
        try {
            const v = await fetchHelper.get(eUrl(formato, 'validar') + `?ano=${year}`, {}, 0, true);
            setValid(v);
            window.Swal.fire({
                icon: v.valido ? 'success' : 'warning',
                title: v.valido ? 'Validación OK' : 'Hay observaciones',
                html: v.valido ? 'Sin observaciones. Puede descargar el archivo.' : '<ul class="text-start small mb-0">' + v.observaciones.map(o => `<li>${o}</li>`).join('') + '</ul>'
            });
        } catch (_) { /* */ }
    };

    const descargar = async (fArch) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(eUrl(formato, 'export') + `?ano=${year}&formatoArchivo=${fArch}`, { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `exogena_${formato}_${year}.${fArch}`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
            await cargarHistorico();
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    return (
        <div className="card">
            <h5 className="card-header">Información exógena DIAN</h5>
            <div className="card-body">
                <div className="alert alert-info py-2 small">
                    <i className="ri-information-line me-1"></i>
                    El archivo en la estructura XML/XSD oficial de la resolución DIAN del año es configurable y queda pendiente de infraestructura.
                    El sistema genera los datos, valida prerequisitos, exporta CSV/XML y conserva el archivo 10 años.
                </div>
                <div className="row g-3 align-items-end mb-4">
                    <div className="col-md-3">
                        <label className="form-label">Formato</label>
                        <select className="form-select" value={formato} onChange={e => { setFormato(e.target.value); setDatos(null); setValid(null); }}>
                            <option value="1647">1647 · Movimientos bancarios</option>
                            <option value="1010">1010 · Terceros</option>
                            <option value="1011">1011 · Información tributaria</option>
                        </select>
                    </div>
                    <div className="col-md-2"><label className="form-label">Año fiscal</label>
                        <input type="number" className="form-control" value={year} onChange={e => setYear(e.target.value)} /></div>
                    <div className="col-md-7">
                        <button className="btn btn-primary me-2" onClick={verDatos}><i className="ri-eye-line me-1"></i>Ver datos</button>
                        <button className="btn btn-label-warning me-2" onClick={validar}><i className="ri-shield-check-line me-1"></i>Validar</button>
                        <button className="btn btn-label-success me-1" onClick={() => descargar('csv')}><i className="ri-file-text-line me-1"></i>CSV</button>
                        <button className="btn btn-label-secondary" onClick={() => descargar('xml')}><i className="ri-file-code-line me-1"></i>XML</button>
                    </div>
                </div>

                {datos && (
                    <div className="table-responsive mb-4">
                        <table className="table table-sm">
                            <thead><tr><th>NIT Banco</th><th>Banco</th><th>Número cuenta</th><th>Tipo</th><th className="text-end">Depósitos</th><th className="text-end">Retiros</th><th className="text-end">Saldo cierre</th></tr></thead>
                            <tbody>
                                {(datos.cuentas || []).map((c, i) => (
                                    <tr key={i}>
                                        <td className="small">{c.nitBanco || '—'}</td>
                                        <td className="small">{c.banco}</td>
                                        <td className="small">{c.numeroCuenta}</td>
                                        <td className="small">{c.tipoCuenta}</td>
                                        <td className="text-end small">{formatPrice(c.depositos)}</td>
                                        <td className="text-end small">{formatPrice(c.retiros)}</td>
                                        <td className="text-end small">{formatPrice(c.saldoCierre)}</td>
                                    </tr>
                                ))}
                                {(!datos.cuentas || datos.cuentas.length === 0) && <tr><td colSpan="7" className="text-center text-muted py-3">Sin datos (no hay movimientos en sesiones cerradas del año)</td></tr>}
                            </tbody>
                            {datos.cuentas && datos.cuentas.length > 0 && (
                                <tfoot><tr className="fw-bold"><td colSpan="4">Totales</td><td className="text-end">{formatPrice(datos.totalDepositos)}</td><td className="text-end">{formatPrice(datos.totalRetiros)}</td><td className="text-end">{formatPrice(datos.totalSaldoCierre)}</td></tr></tfoot>
                            )}
                        </table>
                    </div>
                )}

                <h6 className="mt-2">Histórico de generaciones</h6>
                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>Fecha</th><th>Formato</th><th>Archivo</th><th>Año</th><th>Hash</th></tr></thead>
                        <tbody>
                            {hist.map(h => (
                                <tr key={h.id}>
                                    <td className="small">{h.generadoAt ? String(h.generadoAt).slice(0, 19).replace('T', ' ') : ''}</td>
                                    <td className="small"><span className="badge bg-label-primary">{h.formato}</span></td>
                                    <td className="small text-uppercase">{h.formatoArchivo}</td>
                                    <td className="small">{h.anoFiscal}</td>
                                    <td className="small text-muted" title={h.hashArchivo}>{h.hashArchivo ? h.hashArchivo.slice(0, 12) + '…' : '—'}</td>
                                </tr>
                            ))}
                            {hist.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-3">Sin generaciones registradas</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExogenaDian;
