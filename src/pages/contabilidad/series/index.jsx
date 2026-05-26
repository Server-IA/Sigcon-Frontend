/**
 * HU-CG-03A E3/E5: Pagina de configuracion de Series de Consecutivos por
 * tipo de comprobante. Permite al admin crear/editar/eliminar series y ver
 * el porcentaje de uso de cada rango con alerta visual cuando se acerca al
 * limite (default 80%).
 */

import { useEffect, useState, useCallback } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

import { traducir } from '../../../utils/statusLabels';
const STATUS_BADGE = {
    ACTIVE: 'bg-label-success',
    INACTIVE: 'bg-label-secondary',
    EXHAUSTED: 'bg-label-danger',
};

const STATUS_LABEL = {
    ACTIVE: 'Activa',
    INACTIVE: 'Inactiva',
    EXHAUSTED: 'Agotada',
};

const emptyForm = {
    id: null,
    voucherType: '',
    prefix: '',
    startNumber: 1,
    endNumber: 999999,
    currentNumber: 0,
    alertThresholdPct: 80,
    description: '',
};

const VoucherSeriesAdmin = () => {
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await fetchHelper.get(base_url(['api', 'v1', 'voucher-series']), {}, 0);
            setSeries(Array.isArray(resp?.data) ? resp.data : []);
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al cargar series' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const startCreate = () => {
        setForm(emptyForm);
        setEditing(false);
    };

    const startEdit = (s) => {
        setForm({
            id: s.id,
            voucherType: s.voucherType,
            prefix: s.prefix,
            startNumber: s.startNumber,
            endNumber: s.endNumber,
            currentNumber: s.currentNumber,
            alertThresholdPct: s.alertThresholdPct,
            description: s.description || '',
        });
        setEditing(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ message: '', type: '', show: false });
        const payload = {
            voucherType: (form.voucherType || '').toUpperCase().trim(),
            prefix: (form.prefix || '').toUpperCase().trim(),
            startNumber: Number(form.startNumber),
            endNumber: Number(form.endNumber),
            currentNumber: Number(form.currentNumber || 0),
            alertThresholdPct: Number(form.alertThresholdPct),
            description: form.description || null,
        };

        try {
            if (editing && form.id) {
                await fetchHelper.put(
                    base_url(['api', 'v1', 'voucher-series', form.id]),
                    payload, {}, 0
                );
                setMessage({ type: 'success', show: true, message: 'Serie actualizada correctamente' });
            } else {
                await fetchHelper.post(
                    base_url(['api', 'v1', 'voucher-series']),
                    payload, {}, 0
                );
                setMessage({ type: 'success', show: true, message: 'Serie creada correctamente' });
            }
            setForm(emptyForm);
            setEditing(false);
            await reload();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error al guardar' });
        }
    };

    const handleDelete = async (s) => {
        if (!window.confirm(`Eliminar serie ${s.voucherType}? Esta accion es reversible (soft delete).`)) return;
        try {
            // QA Bloque BG (2026-05-17): firma de fetchHelper.delete es
            // (url, data, headers, time). Pasar `0` como 3er arg fallaba
            // con 'Cannot create property Authorization on number 0'.
            await fetchHelper.delete(
                base_url(['api', 'v1', 'voucher-series', s.id]),
                {}, {}, 0
            );
            setMessage({ type: 'success', show: true, message: 'Serie eliminada' });
            await reload();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al eliminar' });
        }
    };

    return (
        <div className="card">
            <h5 className="card-header">Series de Consecutivos · Comprobantes Contables</h5>
            <div className="card-body">
                <p className="text-muted small mb-3">
                    HU-CG-03A E3/E5: configure el rango y prefijo del numero de comprobante por tipo
                    (JE general, AJ ajustes, CI cierre, REV reversiones, etc.). El sistema notifica
                    cuando el rango se acerca al limite configurado.
                </p>

                <AlertPage type={message.type} message={message.message} show={message.show} />

                <form onSubmit={handleSubmit} className="border rounded p-3 mb-4">
                    <h6 className="mb-3">{editing ? 'Editar serie' : 'Crear nueva serie'}</h6>
                    <div className="row g-2">
                        <div className="col-md-2">
                            <label className="form-label small">Tipo *</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={form.voucherType}
                                onChange={(e) => setForm({ ...form, voucherType: e.target.value.toUpperCase() })}
                                placeholder="JE, AJ, CI..."
                                maxLength={20}
                                required
                                disabled={editing && form.voucherType === 'JE'}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Prefijo *</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={form.prefix}
                                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                                maxLength={20}
                                required
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Numero inicial *</label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={form.startNumber}
                                onChange={(e) => setForm({ ...form, startNumber: e.target.value })}
                                min={1}
                                required
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Numero final *</label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={form.endNumber}
                                onChange={(e) => setForm({ ...form, endNumber: e.target.value })}
                                min={1}
                                required
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Actual</label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={form.currentNumber}
                                onChange={(e) => setForm({ ...form, currentNumber: e.target.value })}
                                min={0}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Umbral alerta (%) *</label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={form.alertThresholdPct}
                                onChange={(e) => setForm({ ...form, alertThresholdPct: e.target.value })}
                                min={0}
                                max={100}
                                required
                            />
                        </div>
                        <div className="col-12">
                            <label className="form-label small">Descripcion</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={255}
                            />
                        </div>
                        <div className="col-12 d-flex gap-2 mt-3">
                            <button type="submit" className="btn btn-primary btn-sm">
                                {editing ? 'Actualizar' : 'Crear serie'}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={startCreate}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                <h6 className="mb-2">Series configuradas ({series.length})</h6>
                {loading ? (
                    <p className="text-muted small">Cargando...</p>
                ) : series.length === 0 ? (
                    <p className="text-muted small fst-italic">Sin series configuradas.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Tipo</th>
                                    <th>Prefijo</th>
                                    <th>Rango</th>
                                    <th>Actual</th>
                                    <th style={{ minWidth: 180 }}>Uso</th>
                                    <th>Estado</th>
                                    <th>Descripcion</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {series.map(s => {
                                    const pct = s.usedPct || 0;
                                    const barColor = s.alert
                                        ? (pct >= 95 ? 'bg-danger' : 'bg-warning')
                                        : 'bg-info';
                                    return (
                                        <tr key={s.id}>
                                            <td><strong>{s.voucherType}</strong></td>
                                            <td><code>{s.prefix}</code></td>
                                            <td>{s.startNumber} .. {s.endNumber}</td>
                                            <td>{s.currentNumber}</td>
                                            <td>
                                                <div className="progress" style={{ height: 18 }}>
                                                    <div
                                                        className={`progress-bar ${barColor}`}
                                                        role="progressbar"
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    >
                                                        {pct}%
                                                    </div>
                                                </div>
                                                {s.alert && (
                                                    <small className="text-danger">
                                                        ⚠ Umbral alcanzado ({s.alertThresholdPct}%)
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[s.status] || 'bg-label-secondary'}`}>
                                                    {traducir(s.status)}
                                                </span>
                                            </td>
                                            <td><small>{s.description || '-'}</small></td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-label-primary me-1"
                                                    title="Editar"
                                                    onClick={() => startEdit(s)}
                                                >
                                                    <i className="ri-edit-line"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-label-danger"
                                                    title="Eliminar"
                                                    onClick={() => handleDelete(s)}
                                                    disabled={s.voucherType === 'JE'}
                                                >
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoucherSeriesAdmin;
