import { useState, useEffect } from 'react';
import { base_url } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-065: verificación de integridad del log de auditoría (cadena de hashes
 * SHA-256 encadenada por empresa). Permite ejecutar la verificación bajo demanda
 * y consultar el historial de corridas (el job nocturno la corre automáticamente).
 */
const IntegridadLog = () => {
    const [history, setHistory] = useState([]);
    const [running, setRunning] = useState(false);

    // time=0 (silencioso): no muestra el loading-Swal de fetchHelper para no
    // pisar el modal de resultado cuando se llama tras un Swal.fire.
    const loadHistory = async () => {
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'audit', 'integrity', 'history']), {}, 0, false, true);
            setHistory(Array.isArray(res) ? res : (res?.data || res?.content || []));
        } catch (_) { setHistory([]); }
    };
    useEffect(() => { loadHistory(); }, []);

    const verificar = async () => {
        setRunning(true);
        try {
            // time=0: el botón ya indica "Verificando..."; evitamos el loading-Swal.
            const res = await fetchHelper.post(base_url(['api', 'v1', 'audit', 'verify-integrity']), {}, {}, 0, true);
            await loadHistory();           // recarga silenciosa ANTES del resultado
            const ok = (res?.result || res?.resultado) === 'OK' || res?.ok === true;
            window.Swal.fire({             // el resultado es lo último que se muestra
                icon: ok ? 'success' : 'error',
                title: ok ? 'Cadena de auditoría íntegra' : 'RUPTURA detectada en la cadena',
                html: `Resultado: <b>${res?.result ?? res?.resultado ?? (ok ? 'OK' : 'RUPTURA')}</b>`
                    + `<br/>Rupturas de encadenamiento: <b>${res?.chainBreaks ?? 0}</b>`
                    + `<br/>Hashes recalculados que no cuadran: <b>${res?.contentMismatches ?? 0}</b>`
                    + (res?.firstBrokenId ? `<br/>Primer registro comprometido: <b>#${res.firstBrokenId}</b>` : '')
            });
        } catch (_) { /* alert mostrado */ } finally { setRunning(false); }
    };

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Verificación de integridad del log de auditoría</span>
                <button className="btn btn-sm btn-primary" disabled={running} onClick={verificar}>
                    <i className="ri-shield-check-line me-1"></i>{running ? 'Verificando...' : 'Verificar integridad ahora'}
                </button>
            </h5>
            <div className="card-body">
                <p className="text-muted small">La cadena de hashes SHA-256 se verifica automáticamente cada noche. Aquí puede ejecutarla bajo demanda y revisar el historial de corridas.</p>
                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>Fecha</th><th>Resultado</th><th>Origen</th><th>Ejecutado por</th><th>Detalle</th></tr></thead>
                        <tbody>
                            {history.map((h, i) => {
                                const res = h.result ?? h.resultado;
                                return (
                                    <tr key={h.id ?? i}>
                                        <td className="small">{(h.executedAt || h.fecha || h.createdAt || '').toString().slice(0, 19).replace('T', ' ')}</td>
                                        <td><span className={`badge ${res === 'OK' ? 'bg-label-success' : 'bg-label-danger'}`}>{res || '-'}</span></td>
                                        <td className="small">{h.triggerSource || h.origen || '-'}</td>
                                        <td className="small">{h.triggeredBy || h.usuario || '-'}</td>
                                        <td className="small">{h.detail || h.detalle || (h.chainBreaks != null ? `rupturas: ${h.chainBreaks}, mismatches: ${h.contentMismatches ?? 0}` : '-')}</td>
                                    </tr>
                                );
                            })}
                            {history.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-3">Sin corridas registradas aún</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IntegridadLog;
