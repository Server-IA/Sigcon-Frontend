import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-074: antigüedad de partidas conciliatorias pendientes. Dashboard con
 * distribución por bucket de severidad (E6), reporte filtrable (E5), alertas a
 * 60/90 días (E3/E4 vía recalcular), cheques por caducar (E7) y resolución
 * manual (E8). Exportable a Excel/CSV/PDF.
 */
const bucketStyle = (b) => ({
    NORMAL: { cls: 'bg-label-success' },
    ATENCION: { cls: 'bg-label-warning' },
    ADVERTENCIA: { cls: '', style: { background: '#ff9f43', color: '#fff' } },
    CRITICA: { cls: 'bg-label-danger' }
}[b] || { cls: 'bg-label-secondary' });

const PartidasAntiguedad = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [dash, setDash] = useState(null);
    const [rep, setRep] = useState(null);
    const [diasMin, setDiasMin] = useState('');
    const [diasMax, setDiasMax] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
            // Embebido: cuenta fija de la URL; standalone: todas las cuentas.
            cargar(embeddedAccountId ? String(embeddedAccountId) : '');
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const aUrl = (...p) => base_url(['api', 'v1', 'banks', 'partidas-antiguedad', ...p]);
    const qs = () => {
        const p = [];
        if (accountId) p.push(`bankAccountId=${accountId}`);
        if (diasMin) p.push(`diasMin=${diasMin}`);
        if (diasMax) p.push(`diasMax=${diasMax}`);
        return p.length ? '?' + p.join('&') : '';
    };

    const cargar = async (acc = accountId) => {
        const accQs = acc ? `?bankAccountId=${acc}` : '';
        try {
            const d = await fetchHelper.get(aUrl('dashboard') + accQs, {}, 0, false, true);
            setDash(d || null);
        } catch (_) { setDash(null); }
        try {
            const r = await fetchHelper.get(aUrl('reporte') + qs2(acc), {}, 0, false, true);
            setRep(r || null);
        } catch (_) { setRep(null); }
    };
    const qs2 = (acc) => {
        const p = [];
        if (acc) p.push(`bankAccountId=${acc}`);
        if (diasMin) p.push(`diasMin=${diasMin}`);
        if (diasMax) p.push(`diasMax=${diasMax}`);
        return p.length ? '?' + p.join('&') : '';
    };

    const onSelect = (e) => { setAccountId(e.target.value); cargar(e.target.value); };

    const recalcular = async () => {
        try {
            const r = await fetchHelper.post(aUrl('recalcular'), {}, {}, 0, true);
            await cargar();
            const a = r?.alertas || {};
            window.Swal.fire({ icon: 'success', title: 'Antigüedad recalculada', html: `Partidas: <b>${r?.recalculadas ?? 0}</b><br/>Alertas 60d: <b>${a.alertas60d ?? 0}</b> · 90d: <b>${a.alertas90d ?? 0}</b>` });
        } catch (_) { /* */ }
    };

    const resolver = async (p) => {
        const { value: tipo } = await window.Swal.fire({
            title: `Resolver partida #${p.id}`,
            input: 'radio',
            inputOptions: { AJUSTE: 'Ajuste contable generado (vincular comprobante)', PROXIMO_PERIODO: 'Se conciliará en el próximo período (justificar)' },
            showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar',
            inputValidator: (v) => !v && 'Seleccione el tipo de resolución'
        });
        if (!tipo) return;
        let body = { tipoResolucion: tipo };
        if (tipo === 'AJUSTE') {
            const { value: cid } = await window.Swal.fire({ title: 'Comprobante de ajuste', input: 'number', inputPlaceholder: 'ID del comprobante', showCancelButton: true, confirmButtonText: 'Resolver', inputValidator: (v) => !v && 'Indique el comprobante' });
            if (!cid) return; body.comprobanteId = Number(cid);
        } else {
            const { value: mot } = await window.Swal.fire({ title: 'Justificación', input: 'textarea', inputPlaceholder: 'Por qué se concilia en el próximo período (mínimo 20 caracteres)', showCancelButton: true, confirmButtonText: 'Resolver', inputValidator: (v) => (!v || v.trim().length < 20) && 'Mínimo 20 caracteres' });
            if (!mot) return; body.motivo = mot;
        }
        try {
            await fetchHelper.post(aUrl(p.id, 'resolver'), body, {}, 0, true);
            await cargar();
            window.Swal.fire({ icon: 'success', title: 'Partida resuelta', timer: 1300, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    const descargar = async (format) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(aUrl('reporte', 'export') + (qs() ? qs() + '&' : '?') + `format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `partidas_pendientes.${format}`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;
    const dist = dash?.distribucionPorBucket || [];
    const cheques = dash?.chequesProximosCaducar || [];

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Antigüedad de partidas conciliatorias</span>
                <button className="btn btn-sm btn-label-secondary" onClick={recalcular}><i className="ri-refresh-line me-1"></i>Recalcular + alertas</button>
            </h5>
            <div className="card-body">
                <div className="row g-3 align-items-end mb-4">
                    {!embeddedAccountId && (
                    <div className="col-md-4">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Todas las cuentas</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    )}
                    <div className="col-md-2"><label className="form-label">Días mín.</label><input type="number" className="form-control" value={diasMin} onChange={e => setDiasMin(e.target.value)} /></div>
                    <div className="col-md-2"><label className="form-label">Días máx.</label><input type="number" className="form-control" value={diasMax} onChange={e => setDiasMax(e.target.value)} /></div>
                    <div className="col-md-4">
                        <button className="btn btn-primary me-2" onClick={() => cargar()}><i className="ri-filter-3-line me-1"></i>Aplicar</button>
                        <button className="btn btn-label-success me-1" onClick={() => descargar('xlsx')}><i className="ri-file-excel-2-line"></i></button>
                        <button className="btn btn-label-secondary me-1" onClick={() => descargar('csv')}><i className="ri-file-text-line"></i></button>
                        <button className="btn btn-label-danger" onClick={() => window.print()}><i className="ri-printer-line"></i></button>
                    </div>
                </div>

                {/* Dashboard (HU-074 E6) */}
                {dash && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body py-3"><small>Total pendientes</small><h5 className="mb-0">{dash.totalPartidas}</h5></div></div></div>
                        <div className="col-md-3"><div className="card bg-label-info"><div className="card-body py-3"><small>Suma montos</small><h5 className="mb-0">{formatPrice(dash.sumaMontos)}</h5></div></div></div>
                        <div className="col-md-6"><div className="card"><div className="card-body py-3"><small className="text-muted">Distribución por bucket</small><div className="d-flex gap-2 mt-1 flex-wrap">{dist.map(b => { const st = bucketStyle(b.bucket); return <span key={b.bucket} className={`badge ${st.cls}`} style={st.style}>{b.bucket}: {b.count}</span>; })}</div></div></div></div>
                    </div>
                )}

                {/* Cheques por caducar (HU-074 E7) */}
                {cheques.length > 0 && (
                    <div className="alert alert-warning">
                        <b><i className="ri-alarm-warning-line me-1"></i>Cheques próximos a caducar (Art. 721 C.Co.):</b>
                        <ul className="mb-0 mt-1">{cheques.map(c => <li key={c.checkId} className="small">Cheque #{c.numero} ({c.beneficiario}) {formatPrice(c.valor)} — caduca {c.caducidad} (en {c.diasParaCaducar} días)</li>)}</ul>
                    </div>
                )}

                {/* Reporte (HU-074 E5) */}
                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>ID</th><th>Cuenta</th><th>Tipo</th><th className="text-end">Monto</th><th>Fecha origen</th><th className="text-end">Días</th><th>Bucket</th><th>Acción</th></tr></thead>
                        <tbody>
                            {(rep?.partidas || []).map(p => { const st = bucketStyle(p.bucket); return (
                                <tr key={p.id}>
                                    <td className="small">{p.id}</td>
                                    <td className="small">{p.bankAccountId}</td>
                                    <td className="small text-muted">{p.tipo}</td>
                                    <td className="text-end small">{formatPrice(p.monto)}</td>
                                    <td className="small">{p.fechaOrigen}</td>
                                    <td className="text-end small">{p.diasAntiguedad}</td>
                                    <td><span className={`badge ${st.cls}`} style={st.style}>{p.bucket}</span></td>
                                    <td><button className="btn btn-sm btn-icon btn-text-primary" title="Resolver partida" onClick={() => resolver(p)}><i className="ri-checkbox-circle-line"></i></button></td>
                                </tr>
                            ); })}
                            {(!rep?.partidas || rep.partidas.length === 0) && <tr><td colSpan="8" className="text-center text-muted py-3">Sin partidas pendientes con los criterios seleccionados</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartidasAntiguedad;
