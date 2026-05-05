import { useEffect, useState, useMemo } from "react";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";
import AlertPage from "../../../components/molecules/AlertPage";

/**
 * HU-PA-18: configuracion de notificaciones por rol.
 *
 * <p>Lista todos los roles y todos los eventos del catalogo agrupados por modulo.
 * Para cada par (rol, evento) muestra un toggle. Si el evento soporta umbral
 * en dias (eventos de "vencimiento proximo"), muestra un selector adicional.
 */
const NotificacionesRolPage = () => {
    const [roles, setRoles] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [subs, setSubs] = useState({});
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const eventsByModule = useMemo(() => {
        const groups = {};
        events.forEach(e => {
            if (!groups[e.module]) groups[e.module] = [];
            groups[e.module].push(e);
        });
        return groups;
    }, [events]);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetchHelper.get(base_url(['api', 'parametrization', 'notification-events']));
                setEvents(r?.data ?? []);
                // Bloque AM (2026-05-03): el endpoint real es /roles/getRoles (POST con
                // DataTableRequest), antes apuntaba a /api/roles que no existe (404).
                // Resultado: dropdown "Seleccione un rol" siempre vacio.
                const rr = await fetchHelper.post(base_url(['roles', 'getRoles']),
                    { draw: 1, start: 0, length: 1000, search: { value: '', regex: false }, order: [], columns: [] });
                setRoles(rr?.data ?? []);
            } catch (e) {
                setError('No se pudo cargar el catalogo: ' + (e?.message ?? e));
            }
        })();
    }, []);

    const loadSubsForRole = async (roleId) => {
        if (!roleId) return;
        setLoading(true);
        try {
            const r = await fetchHelper.get(base_url(['api', 'parametrization', 'roles', String(roleId), 'notification-subscriptions']));
            const map = {};
            (r?.data ?? []).forEach(s => { map[s.eventKey] = s; });
            setSubs(map);
        } catch (e) {
            setError('No se cargaron suscripciones: ' + (e?.message ?? e));
        } finally {
            setLoading(false);
        }
    };

    const onChangeRole = (e) => {
        const id = e.target.value ? Number(e.target.value) : null;
        setSelectedRoleId(id);
        setSubs({});
        if (id) loadSubsForRole(id);
    };

    const upsert = async (eventKey, enabled, thresholdDays) => {
        if (!selectedRoleId) return;
        setSavingKey(eventKey);
        setError(''); setSuccess('');
        try {
            const body = { eventKey, enabled };
            if (thresholdDays != null && thresholdDays !== '') body.thresholdDays = Number(thresholdDays);
            const r = await fetchHelper.put(
                base_url(['api', 'parametrization', 'roles', String(selectedRoleId), 'notification-subscriptions']),
                body
            );
            setSubs(prev => ({ ...prev, [eventKey]: r }));
            setSuccess(`Suscripcion actualizada: ${eventKey}`);
            setTimeout(() => setSuccess(''), 2500);
        } catch (e) {
            setError(e?.message ?? 'Error al actualizar suscripcion');
        } finally {
            setSavingKey(null);
        }
    };

    const removeSub = async (eventKey) => {
        if (!selectedRoleId) return;
        setSavingKey(eventKey);
        try {
            await fetchHelper.delete(base_url(['api', 'parametrization', 'roles', String(selectedRoleId), 'notification-subscriptions', eventKey]));
            setSubs(prev => { const n = { ...prev }; delete n[eventKey]; return n; });
            setSuccess(`Suscripcion eliminada: ${eventKey}`);
            setTimeout(() => setSuccess(''), 2500);
        } catch (e) {
            setError(e?.message ?? 'Error al eliminar suscripcion');
        } finally {
            setSavingKey(null);
        }
    };

    const moduleLabel = (m) => ({
        CG: 'Contabilidad General', AR: 'Cuentas por Cobrar', AP: 'Cuentas por Pagar',
        BNK: 'Bancos y Cajas', NOM: 'Nomina', INT: 'Integracion AAEF',
        AU: 'Auditoria', PA: 'Parametrizacion', TER: 'Terceros', ACT: 'Activos', CFG: 'Listas Contables'
    }[m] || m);

    return (
        <div className="card">
            <h5 className="card-header">
                Notificaciones por rol (HU-PA-18)
                <small className="d-block text-muted mt-1" style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>
                    Define que eventos del sistema disparan notificaciones in-app para los usuarios de cada rol.
                </small>
            </h5>
            <div className="card-body">
                <AlertPage type="success" message={success} show={!!success} />
                <AlertPage type="danger" message={error} show={!!error} />

                <div className="row mb-4">
                    <div className="col-md-6">
                        <label className="form-label">Rol a configurar</label>
                        <select className="form-select" value={selectedRoleId ?? ''} onChange={onChangeRole}>
                            <option value="">Seleccione un rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {!selectedRoleId && (
                    <div className="alert alert-info">
                        <i className="ri-information-line me-2"></i>
                        Seleccione un rol para configurar sus suscripciones.
                    </div>
                )}

                {selectedRoleId && loading && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-loader-line ri-spin"></i> Cargando...
                    </div>
                )}

                {selectedRoleId && !loading && Object.keys(eventsByModule).length === 0 && (
                    <div className="alert alert-warning">No hay eventos en el catalogo.</div>
                )}

                {selectedRoleId && !loading && Object.keys(eventsByModule).map(mod => (
                    <div key={mod} className="mb-4">
                        <h6 className="text-primary mb-2">
                            <span className="badge bg-label-primary me-2">{mod}</span>
                            {moduleLabel(mod)}
                        </h6>
                        <div className="table-responsive">
                            <table className="table table-sm table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Evento</th>
                                        <th style={{ width: '30%' }}>Descripcion</th>
                                        <th style={{ width: '15%' }} className="text-center">Suscrito</th>
                                        <th style={{ width: '15%' }}>Umbral (dias)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventsByModule[mod].map(evt => {
                                        const sub = subs[evt.eventKey];
                                        const enabled = sub?.enabled ?? false;
                                        const isSaving = savingKey === evt.eventKey;
                                        return (
                                            <tr key={evt.eventKey}>
                                                <td>
                                                    <strong>{evt.name}</strong>
                                                    <br />
                                                    <small className="text-muted">{evt.eventKey}</small>
                                                </td>
                                                <td><small>{evt.description}</small></td>
                                                <td className="text-center">
                                                    <div className="form-check form-switch d-inline-block">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            disabled={isSaving}
                                                            checked={enabled}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    upsert(evt.eventKey, true,
                                                                        evt.supportsThreshold ? (sub?.thresholdDays ?? evt.defaultThresholdDays ?? 7) : null);
                                                                } else if (sub) {
                                                                    removeSub(evt.eventKey);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    {evt.supportsThreshold && enabled ? (
                                                        <select
                                                            className="form-select form-select-sm"
                                                            disabled={isSaving}
                                                            value={sub?.thresholdDays ?? evt.defaultThresholdDays ?? 7}
                                                            onChange={(e) => upsert(evt.eventKey, true, Number(e.target.value))}>
                                                            {[1, 3, 5, 7, 15].map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    ) : (
                                                        <small className="text-muted">{evt.supportsThreshold ? '-' : 'N/A'}</small>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificacionesRolPage;
