import { useState, useEffect } from 'react';
import { base_url } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-062 / BNK-HU-063: soportes conservados (extractos/CSV importados) con
 * hash SHA-256 y retención 10 años. Permite listar, verificar integridad,
 * descargar el original y consultar el reporte de retención.
 */
const fmtBytes = (n) => {
    if (n == null) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
};

const SoportesConciliacion = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [soportes, setSoportes] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
        })();
    }, []);

    const load = async (id) => {
        if (!id) { setSoportes([]); return; }
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'archivos-soporte', 'by-account', id]), {}, 1, false, true);
            setSoportes(Array.isArray(res) ? res : (res?.data || []));
        } catch (_) { setSoportes([]); }
    };

    const onSelect = (e) => { setAccountId(e.target.value); load(e.target.value); };

    // Embebido: cuenta fija de la URL, carga automática.
    useEffect(() => {
        if (embeddedAccountId) load(String(embeddedAccountId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embeddedAccountId]);

    const verificar = async (id) => {
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'archivos-soporte', id, 'verify']), {}, 1, false, true);
            const integro = res?.integro ?? res?.intact ?? res?.valid;
            window.Swal.fire({
                icon: integro ? 'success' : 'error',
                title: integro ? 'Integridad verificada' : 'Integridad COMPROMETIDA',
                html: res?.message || (integro ? 'El SHA-256 recalculado coincide con el registrado al cargar.' : 'El archivo fue alterado: el hash no coincide.')
            });
        } catch (_) { /* */ }
    };

    const descargar = async (s) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(base_url(['api', 'v1', 'banks', 'archivos-soporte', s.id, 'download']), { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = s.fileName || s.nombreArchivo || ('soporte-' + s.id);
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    const reporteRetencion = async () => {
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'archivos-soporte', 'retention-report']), {}, 1, false, true);
            const total = res?.totalArchivos ?? res?.total ?? '?';
            const bytes = res?.totalBytesAlmacenados ?? res?.totalBytes ?? res?.bytes ?? 0;
            const prox = res?.proximosAVencer6Meses ?? res?.proximosAVencer ?? 0;
            window.Swal.fire({
                title: 'Reporte de retención',
                html: `Total soportes: <b>${total}</b><br/>Tamaño total: <b>${fmtBytes(bytes)}</b>`
                    + `<br/>Próximos a vencer (6 meses): <b>${prox}</b>`
                    + (res?.nota ? `<br/><small class="text-muted">${res.nota}</small>` : '')
            });
        } catch (_) { /* */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Soportes de conciliación (extractos conservados)</span>
                <button className="btn btn-sm btn-label-info" onClick={reporteRetencion}><i className="ri-archive-line me-1"></i>Reporte de retención</button>
            </h5>
            <div className="card-body">
                {!embeddedAccountId && (
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                </div>
                )}

                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>Archivo</th><th>Hash SHA-256</th><th className="text-end">Tamaño</th><th>Cargado</th><th>Retener hasta</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {soportes.map(s => (
                                <tr key={s.id}>
                                    <td className="small">{s.fileName || s.nombreArchivo || ('#' + s.id)}</td>
                                    <td><code className="small">{(s.hashSha256 || s.hash || '').slice(0, 16)}…</code></td>
                                    <td className="text-end small">{fmtBytes(s.fileSize ?? s.tamanio ?? s.size)}</td>
                                    <td className="small">{(s.createdAt || s.cargaAt || '').toString().slice(0, 10)}</td>
                                    <td className="small">{(s.retenerHasta || '').toString().slice(0, 10)}</td>
                                    <td>
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title="Verificar integridad" onClick={() => verificar(s.id)}><i className="ri-shield-check-line"></i></button>
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title="Descargar" onClick={() => descargar(s)}><i className="ri-download-line"></i></button>
                                    </td>
                                </tr>
                            ))}
                            {soportes.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-3">Sin soportes para esta cuenta (se conservan al importar un extracto CSV)</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SoportesConciliacion;
