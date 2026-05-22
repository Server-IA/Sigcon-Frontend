import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-076 E4-E7: diferencia en cambio (NIC 21) de cuentas en moneda extranjera.
 * - E4/E5: calcular la diferencia al cierre (TRM de cierre vs TRM aplicada por movimiento).
 * - E6: generar el comprobante de diferencia en cambio en BORRADOR.
 * - E7: reporte de movimientos en moneda extranjera, exportable a Excel/CSV.
 */
const DiferenciaCambio = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [fechaCierre, setFechaCierre] = useState(new Date().toISOString().slice(0, 10));
    const [calc, setCalc] = useState(null);
    const [rep, setRep] = useState(null);

    const dUrl = (...p) => base_url(['api', 'v1', 'banks', 'diferencia-cambio', ...p]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                const foreign = (res?.data || []).filter(a => {
                    const iso = a.currencyTypeDTO?.isoCode || a.currencyType?.isoCode;
                    return iso && iso !== 'COP';
                });
                setAccounts(foreign);
                // Standalone: auto-selecciona la primera cuenta extranjera. Embebido:
                // se respeta la cuenta fija de la URL (aunque sea COP; el backend responde).
                if (!embeddedAccountId && foreign.length) setAccountId(String(foreign[0].id));
            } catch (_) { setAccounts([]); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const accLabel = (a) => `${a.code || a.accountNumber || ('#' + a.id)} · ${a.currencyTypeDTO?.isoCode || a.currencyType?.isoCode || ''}`;

    const calcular = async () => {
        setCalc(null);
        if (!accountId) { window.Swal.fire({ icon: 'warning', title: 'Seleccione una cuenta en moneda extranjera' }); return; }
        try {
            const c = await fetchHelper.get(dUrl('calcular') + `?bankAccountId=${accountId}&fechaCierre=${fechaCierre}`, {}, 0, true);
            setCalc(c || null);
        } catch (_) { /* fetchHelper muestra el error (ej. BNK-CON-028 si no cuadra) */ }
    };

    const generar = async () => {
        if (!accountId) return;
        const r = await window.Swal.fire({
            icon: 'question', title: 'Generar asiento de diferencia en cambio',
            text: 'Se creará un comprobante en BORRADOR. ¿Continuar?',
            showCancelButton: true, confirmButtonText: 'Generar', cancelButtonText: 'Cancelar'
        });
        if (!r.isConfirmed) return;
        try {
            const res = await fetchHelper.post(dUrl('generar-asiento') + `?bankAccountId=${accountId}&fechaCierre=${fechaCierre}`, {}, {}, 0, true);
            window.Swal.fire({
                icon: 'success', title: 'Comprobante generado (BORRADOR)',
                html: `Comprobante: <b>${res?.voucherCode || ('#' + res?.comprobanteId)}</b><br/>Monto: <b>${formatPrice(res?.montoAsiento)}</b>`
            });
        } catch (_) { /* */ }
    };

    const cargarReporte = async () => {
        if (!accountId) return;
        try {
            const r = await fetchHelper.get(dUrl('reporte') + `?bankAccountId=${accountId}&fechaCierre=${fechaCierre}`, {}, 0, false, true);
            setRep(r || null);
        } catch (_) { setRep(null); }
    };

    const exportar = async (format) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(dUrl('reporte', 'export') + `?bankAccountId=${accountId}&fechaCierre=${fechaCierre}&format=${format}`,
                { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `moneda_extranjera.${format}`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    const sentidoBadge = (s) => ({
        FAVORABLE_INGRESO: { cls: 'bg-label-success', txt: 'Favorable (ingreso 421020)' },
        DESFAVORABLE_GASTO: { cls: 'bg-label-danger', txt: 'Desfavorable (gasto 530530)' },
        SIN_DIFERENCIA: { cls: 'bg-label-secondary', txt: 'Sin diferencia' }
    }[s] || { cls: 'bg-label-secondary', txt: s });

    return (
        <div className="card">
            <h5 className="card-header">Diferencia en cambio (NIC 21)</h5>
            <div className="card-body">
                {!embeddedAccountId && accounts.length === 0 && (
                    <div className="alert alert-warning">
                        No hay cuentas bancarias en moneda extranjera. Cree una cuenta con moneda distinta de COP en Bancos y Cajas → Cuentas Bancarias.
                    </div>
                )}
                {embeddedAccountId && (
                    <div className="alert alert-light border py-2 small">
                        <i className="ri-information-line me-1" />Esta herramienta aplica solo a cuentas en <strong>moneda extranjera</strong>. Si esta cuenta es en COP, el cálculo no arrojará diferencias.
                    </div>
                )}
                <div className="row g-3 align-items-end mb-4">
                    {!embeddedAccountId && (
                    <div className="col-md-5">
                        <label className="form-label">Cuenta (moneda extranjera)</label>
                        <select className="form-select" value={accountId} onChange={e => { setAccountId(e.target.value); setCalc(null); setRep(null); }}>
                            <option value="">Seleccione…</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    )}
                    <div className="col-md-3"><label className="form-label">Fecha de cierre</label>
                        <input type="date" className="form-control" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} /></div>
                    <div className="col-md-4">
                        <button className="btn btn-primary me-2" onClick={calcular}><i className="ri-calculator-line me-1"></i>Calcular</button>
                        <button className="btn btn-label-secondary" onClick={cargarReporte}><i className="ri-file-list-3-line me-1"></i>Reporte</button>
                    </div>
                </div>

                {/* Resultado del cálculo (E5/E6) */}
                {calc && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-3"><div className="card bg-label-info"><div className="card-body py-3"><small>Moneda · TRM cierre</small><h5 className="mb-0">{calc.moneda} · {formatPrice(calc.trmCierre)}</h5></div></div></div>
                        <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body py-3"><small>Movimientos evaluados</small><h5 className="mb-0">{calc.movimientosEvaluados}</h5></div></div></div>
                        <div className="col-md-3"><div className="card"><div className="card-body py-3"><small className="text-muted">Diferencia total</small><h5 className="mb-0">{formatPrice(calc.diferenciaTotal)}</h5></div></div></div>
                        <div className="col-md-3 d-flex align-items-center">
                            <div>
                                <span className={`badge ${sentidoBadge(calc.sentido).cls} mb-2`}>{sentidoBadge(calc.sentido).txt}</span><br />
                                <button className="btn btn-sm btn-success" onClick={generar} disabled={calc.sentido === 'SIN_DIFERENCIA'}>
                                    <i className="ri-file-add-line me-1"></i>Generar asiento
                                </button>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead><tr><th>Mov</th><th>Fecha</th><th className="text-end">Monto {calc.moneda}</th><th className="text-end">TRM aplicada</th><th className="text-end">TRM cierre</th><th className="text-end">Diferencia (COP)</th></tr></thead>
                                    <tbody>
                                        {(calc.detalle || []).map(d => (
                                            <tr key={d.movimientoId}>
                                                <td className="small">{d.movimientoId}</td>
                                                <td className="small">{d.fecha}</td>
                                                <td className="text-end small">{formatPrice(d.montoOriginal)}</td>
                                                <td className="text-end small">{formatPrice(d.trmAplicada)}</td>
                                                <td className="text-end small">{formatPrice(d.trmCierre)}</td>
                                                <td className="text-end small">{formatPrice(d.diferencia)}</td>
                                            </tr>
                                        ))}
                                        {(!calc.detalle || calc.detalle.length === 0) && <tr><td colSpan="6" className="text-center text-muted py-3">Sin movimientos conciliados</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reporte moneda extranjera (E7) */}
                {rep && (
                    <div className="card border">
                        <div className="card-header d-flex justify-content-between align-items-center py-2">
                            <span><b>Reporte moneda extranjera</b> · {rep.moneda} · Total diferencia: {formatPrice(rep.totalDiferencia)}</span>
                            <span>
                                <button className="btn btn-sm btn-label-success me-1" onClick={() => exportar('xlsx')}><i className="ri-file-excel-2-line"></i></button>
                                <button className="btn btn-sm btn-label-secondary" onClick={() => exportar('csv')}><i className="ri-file-text-line"></i></button>
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead><tr><th>Mov</th><th>Fecha</th><th className="text-end">Monto</th><th className="text-end">TRM aplic.</th><th className="text-end">Equiv. COP</th><th className="text-end">Equiv. cierre</th><th className="text-end">Diferencia</th><th>Estado</th></tr></thead>
                                    <tbody>
                                        {(rep.movimientos || []).map(m => (
                                            <tr key={m.movimientoId}>
                                                <td className="small">{m.movimientoId}</td>
                                                <td className="small">{m.fecha}</td>
                                                <td className="text-end small">{formatPrice(m.montoOriginal)}</td>
                                                <td className="text-end small">{m.trmAplicada ? formatPrice(m.trmAplicada) : '—'}</td>
                                                <td className="text-end small">{m.montoFuncional != null ? formatPrice(m.montoFuncional) : '—'}</td>
                                                <td className="text-end small">{m.equivalenteCierre != null ? formatPrice(m.equivalenteCierre) : '—'}</td>
                                                <td className="text-end small">{m.diferencia != null ? formatPrice(m.diferencia) : '—'}</td>
                                                <td className="small">{m.estado}</td>
                                            </tr>
                                        ))}
                                        {(!rep.movimientos || rep.movimientos.length === 0) && <tr><td colSpan="8" className="text-center text-muted py-3">Sin movimientos en el período</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiferenciaCambio;
