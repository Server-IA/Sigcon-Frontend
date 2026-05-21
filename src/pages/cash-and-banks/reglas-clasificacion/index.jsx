import { useState, useEffect } from 'react';
import { base_url } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-071: catálogo de reglas de clasificación que usa el pre-procesamiento.
 * CRUD (crear/editar/activar-desactivar) + probar regla contra histórico.
 */
const EMPTY = {
    id: null, nombre: '', prioridad: 100, patronRegex: '', signo: 'CUALQUIERA',
    montoMin: '', montoMax: '', tipoMovimiento: '', cuentaPucSugerida: '',
    alcance: 'GLOBAL', bancoId: '', cuentaBancariaId: '', activa: true
};

const ReglasClasificacion = () => {
    const [reglas, setReglas] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(false);

    const load = async () => {
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'reglas-clasificacion']), {}, 1, false, true);
            setReglas(Array.isArray(res) ? res : (res?.data || []));
        } catch (_) { setReglas([]); }
    };
    useEffect(() => { load(); }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const reset = () => { setForm(EMPTY); setEditing(false); };

    const startEdit = (r) => {
        setForm({
            id: r.id, nombre: r.nombre || '', prioridad: r.prioridad ?? 100, patronRegex: r.patronRegex || '',
            signo: r.signo || 'CUALQUIERA', montoMin: r.montoMin ?? '', montoMax: r.montoMax ?? '',
            tipoMovimiento: r.tipoMovimiento || '', cuentaPucSugerida: r.cuentaPucSugerida || '',
            alcance: r.alcance || 'GLOBAL', bancoId: r.bancoId ?? '', cuentaBancariaId: r.cuentaBancariaId ?? '', activa: r.activa
        });
        setEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const save = async () => {
        const body = {
            nombre: form.nombre, prioridad: Number(form.prioridad) || 100, patronRegex: form.patronRegex,
            signo: form.signo, tipoMovimiento: form.tipoMovimiento, cuentaPucSugerida: form.cuentaPucSugerida || null,
            alcance: form.alcance,
            montoMin: form.montoMin === '' ? null : Number(form.montoMin),
            montoMax: form.montoMax === '' ? null : Number(form.montoMax),
            bancoId: form.bancoId === '' ? null : Number(form.bancoId),
            cuentaBancariaId: form.cuentaBancariaId === '' ? null : Number(form.cuentaBancariaId),
            activa: form.activa
        };
        try {
            if (editing && form.id) await fetchHelper.put(base_url(['api', 'v1', 'banks', 'reglas-clasificacion', form.id]), body, {}, 1000, true);
            else await fetchHelper.post(base_url(['api', 'v1', 'banks', 'reglas-clasificacion']), body, {}, 1000, true);
            window.Swal.fire({ icon: 'success', title: 'Regla guardada', timer: 1200, showConfirmButton: false });
            reset(); load();
        } catch (_) { /* alert mostrado */ }
    };

    const toggle = async (r) => {
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'reglas-clasificacion', r.id, 'toggle']), { activa: !r.activa }, {}, 1000, true);
            load();
        } catch (_) { /* */ }
    };

    const test = async () => {
        if (!form.patronRegex) { window.Swal.fire({ icon: 'info', title: 'Ingrese un patrón regex para probar' }); return; }
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'reglas-clasificacion', 'test']), { patronRegex: form.patronRegex }, {}, 1000, true);
            const coinc = res?.coincidencias ?? res?.matches ?? (res?.muestra?.length) ?? 0;
            const eval_ = res?.evaluados ?? res?.evaluated ?? '?';
            window.Swal.fire({ icon: 'info', title: 'Resultado de la prueba', html: `Evaluados: <b>${eval_}</b><br/>Coincidencias: <b>${coinc}</b>` });
        } catch (_) { /* alert mostrado */ }
    };

    return (
        <div className="card">
            <h5 className="card-header">Reglas de clasificación de movimientos</h5>
            <div className="card-body">
                <div className="border rounded p-3 mb-4">
                    <h6 className="mb-3">{editing ? 'Editar regla' : 'Nueva regla'}</h6>
                    <div className="row g-3">
                        <div className="col-md-4"><label className="form-label">Nombre *</label>
                            <input className="form-control" value={form.nombre} onChange={e => set('nombre', e.target.value)} /></div>
                        <div className="col-md-2"><label className="form-label">Prioridad (1-999)</label>
                            <input type="number" className="form-control" value={form.prioridad} onChange={e => set('prioridad', e.target.value)} /></div>
                        <div className="col-md-6"><label className="form-label">Patrón regex *</label>
                            <input className="form-control" value={form.patronRegex} onChange={e => set('patronRegex', e.target.value)} placeholder="ej. GMF|4X1000" /></div>
                        <div className="col-md-3"><label className="form-label">Signo</label>
                            <select className="form-select" value={form.signo} onChange={e => set('signo', e.target.value)}>
                                <option value="CUALQUIERA">Cualquiera</option><option value="DEBITO">Débito</option><option value="CREDITO">Crédito</option>
                            </select></div>
                        <div className="col-md-3"><label className="form-label">Tipo de movimiento *</label>
                            <input className="form-control" value={form.tipoMovimiento} onChange={e => set('tipoMovimiento', e.target.value)} placeholder="ej. GMF" /></div>
                        <div className="col-md-3"><label className="form-label">Cuenta PUC sugerida</label>
                            <input className="form-control" value={form.cuentaPucSugerida} onChange={e => set('cuentaPucSugerida', e.target.value)} placeholder="ej. 530525" /></div>
                        <div className="col-md-3"><label className="form-label">Alcance</label>
                            <select className="form-select" value={form.alcance} onChange={e => set('alcance', e.target.value)}>
                                <option value="GLOBAL">Global</option><option value="BANCO">Banco</option><option value="CUENTA">Cuenta</option>
                            </select></div>
                        <div className="col-md-3"><label className="form-label">Monto mínimo</label>
                            <input type="number" className="form-control" value={form.montoMin} onChange={e => set('montoMin', e.target.value)} /></div>
                        <div className="col-md-3"><label className="form-label">Monto máximo</label>
                            <input type="number" className="form-control" value={form.montoMax} onChange={e => set('montoMax', e.target.value)} /></div>
                        {form.alcance === 'BANCO' && <div className="col-md-3"><label className="form-label">Banco ID</label>
                            <input type="number" className="form-control" value={form.bancoId} onChange={e => set('bancoId', e.target.value)} /></div>}
                        {form.alcance === 'CUENTA' && <div className="col-md-3"><label className="form-label">Cuenta bancaria ID</label>
                            <input type="number" className="form-control" value={form.cuentaBancariaId} onChange={e => set('cuentaBancariaId', e.target.value)} /></div>}
                    </div>
                    <div className="mt-3">
                        <button className="btn btn-primary me-2" onClick={save}><i className="ri-save-line me-1"></i>Guardar</button>
                        <button className="btn btn-label-info me-2" onClick={test}><i className="ri-test-tube-line me-1"></i>Probar regla</button>
                        {editing && <button className="btn btn-label-secondary" onClick={reset}>Cancelar</button>}
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>Prioridad</th><th>Nombre</th><th>Regex</th><th>Signo</th><th>Tipo</th><th>PUC</th><th>Alcance</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {reglas.map(r => (
                                <tr key={r.id}>
                                    <td>{r.prioridad}</td>
                                    <td>{r.nombre}</td>
                                    <td><code className="small">{r.patronRegex}</code></td>
                                    <td>{r.signo}</td>
                                    <td>{r.tipoMovimiento}</td>
                                    <td>{r.cuentaPucSugerida || '-'}</td>
                                    <td>{r.alcance}</td>
                                    <td><span className={`badge ${r.activa ? 'bg-label-success' : 'bg-label-secondary'}`}>{r.activa ? 'Activa' : 'Inactiva'}</span></td>
                                    <td>
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title="Editar" onClick={() => startEdit(r)}><i className="ri-edit-line"></i></button>
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title={r.activa ? 'Desactivar' : 'Activar'} onClick={() => toggle(r)}><i className={r.activa ? 'ri-toggle-fill' : 'ri-toggle-line'}></i></button>
                                    </td>
                                </tr>
                            ))}
                            {reglas.length === 0 && <tr><td colSpan="9" className="text-center text-muted py-3">Sin reglas</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReglasClasificacion;
