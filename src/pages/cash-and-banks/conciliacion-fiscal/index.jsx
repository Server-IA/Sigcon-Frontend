import { useState } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-080: conciliación fiscal (art. 772-1 ET) para formatos 2516/2517.
 * Saldos NIIF vs fiscal, diferencias temporarias/permanentes, GMF (deducibilidad),
 * diferencia en cambio realizada/no realizada, notas por partida y export CSV + retención.
 * El archivo en estructura XML/XSD oficial DIAN es infraestructura diferida.
 */
const ConciliacionFiscal = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);

    const fUrl = (...p) => base_url(['api', 'v1', 'banks', 'conciliacion-fiscal', ...p]);

    const generar = async () => {
        setData(null);
        try { setData(await fetchHelper.get(base_url(['api', 'v1', 'banks', 'conciliacion-fiscal']) + `?ano=${year}`, {}, 0, true)); }
        catch (_) { /* */ }
    };

    const agregarNota = async (partidaKey) => {
        const { value: nota } = await window.Swal.fire({
            title: 'Nota explicativa', input: 'textarea',
            inputPlaceholder: 'Explique la diferencia de esta partida…',
            showCancelButton: true, confirmButtonText: 'Guardar',
            inputValidator: v => (!v || v.trim().length < 3) && 'Escriba la nota'
        });
        if (!nota) return;
        try {
            await fetchHelper.post(fUrl('nota'), { ano: Number(year), partidaKey, nota }, {}, 0, true);
            await generar();
            window.Swal.fire({ icon: 'success', title: 'Nota guardada', timer: 1100, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    const exportar = async (fmt) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(fUrl('export') + `?ano=${year}&formato=${fmt}`, { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `conciliacion_fiscal_${fmt}_${year}.csv`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo exportar' }); }
    };

    const tipoBadge = (t) => ({ TEMPORARIA: 'bg-label-warning', PERMANENTE: 'bg-label-danger', NINGUNA: 'bg-label-secondary' }[t] || 'bg-label-secondary');

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Conciliación fiscal (Art. 772-1 ET)</span>
                <span>
                    <input type="number" className="form-control form-control-sm d-inline-block me-2" style={{ width: 110 }} value={year} onChange={e => setYear(e.target.value)} />
                    <button className="btn btn-sm btn-primary me-2" onClick={generar}><i className="ri-scales-3-line me-1"></i>Generar</button>
                    <button className="btn btn-sm btn-label-success me-1" onClick={() => exportar('2516')}>2516</button>
                    <button className="btn btn-sm btn-label-secondary" onClick={() => exportar('2517')}>2517</button>
                </span>
            </h5>
            <div className="card-body">
                <div className="alert alert-info py-2 small">
                    <i className="ri-information-line me-1"></i>
                    El archivo en estructura XML/XSD oficial DIAN 2516/2517 (por año gravable) es configurable y queda pendiente de infraestructura.
                    El sistema computa NIIF vs fiscal, diferencias, GMF y diferencia en cambio, con notas y export CSV.
                </div>

                {data && (
                    <>
                        <div className="row g-3 mb-4">
                            <div className="col-md-3"><div className="card bg-label-info"><div className="card-body py-3"><small>Total NIIF</small><h5 className="mb-0">{formatPrice(data.totalNiif)}</h5></div></div></div>
                            <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body py-3"><small>Total fiscal</small><h5 className="mb-0">{formatPrice(data.totalFiscal)}</h5></div></div></div>
                            <div className="col-md-3"><div className="card bg-label-warning"><div className="card-body py-3"><small>Dif. temporaria</small><h5 className="mb-0">{formatPrice(data.totalDiferenciaTemporaria)}</h5></div></div></div>
                            <div className="col-md-3"><div className="card"><div className="card-body py-3">
                                <small className="text-muted">GMF año (deducibilidad {data.gmf?.deduciblePct}%)</small>
                                <div className="small">Gasto {formatPrice(data.gmf?.gastoGmfAnio)} · Deducible {formatPrice(data.gmf?.gmfDeducible)} · No deducible {formatPrice(data.gmf?.gmfNoDeducible)}</div>
                            </div></div></div>
                        </div>

                        <div className="alert alert-secondary py-2 small">
                            <b>Diferencia en cambio:</b> no realizada (revaluación al cierre) {formatPrice(data.diferenciaEnCambio?.noRealizada)} ·
                            realizada (al cobrar/pagar) {formatPrice(data.diferenciaEnCambio?.realizada)}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm">
                                <thead><tr><th>Cuenta</th><th>Moneda</th><th className="text-end">Saldo NIIF</th><th className="text-end">Saldo fiscal</th><th className="text-end">Diferencia</th><th>Tipo</th><th>Nota</th><th></th></tr></thead>
                                <tbody>
                                    {(data.partidas || []).map(p => (
                                        <tr key={p.partidaKey}>
                                            <td className="small">{p.cuenta}</td>
                                            <td className="small">{p.moneda}</td>
                                            <td className="text-end small">{formatPrice(p.saldoContableNiif)}</td>
                                            <td className="text-end small">{formatPrice(p.saldoFiscal)}</td>
                                            <td className="text-end small">{formatPrice(p.diferencia)}</td>
                                            <td><span className={`badge ${tipoBadge(p.tipoDiferencia)}`}>{p.tipoDiferencia}</span></td>
                                            <td className="small text-muted">{p.nota || '—'}</td>
                                            <td><button className="btn btn-sm btn-icon btn-text-secondary" title="Agregar nota" onClick={() => agregarNota(p.partidaKey)}><i className="ri-sticky-note-line"></i></button></td>
                                        </tr>
                                    ))}
                                    {(!data.partidas || data.partidas.length === 0) && <tr><td colSpan="8" className="text-center text-muted py-3">Sin cuentas bancarias</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ConciliacionFiscal;
