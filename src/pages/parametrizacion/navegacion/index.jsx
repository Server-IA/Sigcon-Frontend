import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from '../../../components/atoms/Button';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import { refreshMenu } from '../../../routes/routes';

/**
 * HU-PA-NAV-01: configurar el orden de los módulos en el sidebar.
 *
 * <p>Caracteristicas:
 * <ul>
 *   <li>E1: lista todos los módulos del sistema con su orden actual.</li>
 *   <li>E2: reordenamiento con botones ↑ ↓ y feedback inmediato (sin persistir).</li>
 *   <li>E3: persistencia explícita con botón Guardar.</li>
 *   <li>E4: Cancelar pide confirmación si hay cambios sin guardar.</li>
 *   <li>E5: el orden NO concede ni restringe acceso (el filtro lo hace el backend por permisos).</li>
 *   <li>E7: aplicación inmediata vía window.dispatchEvent('refreshMenu').</li>
 * </ul>
 */
const NavegacionPage = () => {
    const dispatch = useDispatch();
    const [modules, setModules] = useState([]);              // lista completa cargada del backend
    const [order, setOrder] = useState([]);                   // array de IDs en orden actual (en edicion)
    const [persistedOrder, setPersistedOrder] = useState([]); // orden persistido en BD
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            // Lista global de modulos del sistema (fuente de verdad para nombres/iconos)
            const modsResp = await fetchHelper.get(base_url(['api', 'modules', 'menu']));
            const modulesList = modsResp?.data || modsResp || [];

            // Orden persistido (si existe) — array de ids
            const orderResp = await fetchHelper.get(base_url(['api', 'parametrization', 'nav-settings', 'module-order']));
            const persisted = (orderResp?.data) || [];

            const allIds = modulesList.map((m) => m.id);
            // Si hay orden persistido, lo usamos; los IDs nuevos (no listados) se agregan al final.
            const merged = persisted.length > 0
                ? [...persisted.filter(id => allIds.includes(id)), ...allIds.filter(id => !persisted.includes(id))]
                : allIds;

            setModules(modulesList);
            setOrder(merged);
            setPersistedOrder(merged);
        } catch (e) {
            setNotification({ type: 'danger', text: 'Error cargando módulos: ' + (e?.msg || e?.message || 'desconocido') });
        } finally {
            setLoading(false);
        }
    };

    const moveUp = (idx) => {
        if (idx <= 0) return;
        const next = [...order];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        setOrder(next);
    };

    const moveDown = (idx) => {
        if (idx >= order.length - 1) return;
        const next = [...order];
        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
        setOrder(next);
    };

    const isDirty = JSON.stringify(order) !== JSON.stringify(persistedOrder);

    const handleSave = async () => {
        setSaving(true);
        try {
            const resp = await fetchHelper.put(
                base_url(['api', 'parametrization', 'nav-settings', 'module-order']),
                { order }
            );
            setPersistedOrder([...order]);
            setNotification({ type: 'success', text: resp?.message || 'Orden guardado' });
            // Bloque AM (2026-05-03): el window event 'refreshMenu' no lo escucha
            // nadie. El sidebar se hidrata desde Redux.modules.modules. Hay que
            // dispatch el thunk refreshMenu para que re-fetche /api/modules/menu
            // (que ahora aplica el orden persistido en backend) y dispatch SET_MODULES.
            dispatch(refreshMenu());
        } catch (e) {
            setNotification({ type: 'danger', text: e?.msg || e?.message || 'Error guardando' });
        } finally {
            setSaving(false);
        }
    };

    // QA Bloque PA Bug 91 (HU-PA-NAV-01 E4, 2026-05-11): SweetAlert al cancelar
    // con cambios sin guardar. Antes usabamos window.confirm que no tiene el
    // estilo del sistema y a veces es bloqueado por el browser. La HU exige
    // SweetAlert (estilo coherente con el resto de la app) que confirme y
    // restaure el orden persistido si el user aprueba descartar.
    const handleCancel = async () => {
        if (!isDirty) {
            // sin cambios: solo informar
            setNotification({ type: 'info', text: 'No hay cambios para descartar' });
            return;
        }
        const result = await window.Swal.fire({
            title: 'Hay cambios sin guardar',
            text: '¿Desea descartar los cambios y restablecer el orden?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, descartar',
            cancelButtonText: 'No, seguir editando',
            customClass: {
                confirmButton: 'btn btn-warning me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        });
        if (!result.isConfirmed) return;
        setOrder([...persistedOrder]);
        setNotification({ type: 'success', text: 'Cambios descartados. Orden restablecido al guardado anterior.' });
    };

    const handleReset = async () => {
        const result = await window.Swal.fire({
            title: '¿Restablecer al orden default del sistema?',
            text: 'El orden actual se reemplazara por el orden predeterminado de SIGCON.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'btn btn-danger me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        });
        if (!result.isConfirmed) return;
        try {
            await fetchHelper.del(base_url(['api', 'parametrization', 'nav-settings', 'module-order']));
            await load();
            setNotification({ type: 'success', text: 'Orden reseteado al default' });
            dispatch(refreshMenu());
        } catch (e) {
            setNotification({ type: 'danger', text: e?.msg || 'Error al resetear' });
        }
    };

    if (loading) {
        return <div className="card"><div className="card-body text-center p-5"><div className="spinner-border text-primary" /></div></div>;
    }

    const modById = Object.fromEntries(modules.map((m) => [m.id, m]));

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="ri-menu-line me-2"></i>Configuración de Navegación</h5>
                <small className="text-muted">HU-PA-NAV-01 · Orden de módulos en sidebar</small>
            </div>

            <div className="card-body">
                {notification && (
                    <div className={`alert alert-${notification.type} alert-dismissible`}>
                        {notification.text}
                        <button className="btn-close" onClick={() => setNotification(null)}></button>
                    </div>
                )}

                <div className="alert alert-info py-2">
                    <i className="ri-information-line me-1"></i>
                    Define el orden global de los módulos en el sidebar para todos los usuarios de tu empresa.
                    El orden NO concede ni restringe acceso — los permisos siguen siendo los que rigen qué ve cada usuario.
                </div>

                <div className="row">
                    <div className="col-lg-8">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}>#</th>
                                    <th>Módulo</th>
                                    <th style={{ width: 120 }} className="text-center">Reordenar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.map((id, idx) => {
                                    const m = modById[id];
                                    if (!m) return null;
                                    return (
                                        <tr key={id}>
                                            <td><strong>{idx + 1}</strong></td>
                                            <td>
                                                {m.icon && <i className={`${m.icon} me-2`} style={{ color: '#1E5DAB' }}></i>}
                                                {m.name}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    className="btn btn-sm btn-outline-secondary me-1"
                                                    disabled={idx === 0}
                                                    onClick={() => moveUp(idx)}
                                                    title="Subir">
                                                    <i className="ri-arrow-up-line"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    disabled={idx === order.length - 1}
                                                    onClick={() => moveDown(idx)}
                                                    title="Bajar">
                                                    <i className="ri-arrow-down-line"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Panel de preview del sidebar */}
                    <div className="col-lg-4">
                        <h6 className="text-muted mb-2">Preview del sidebar</h6>
                        <div className="border rounded p-2" style={{ background: '#1E5DAB', color: '#FFF', minHeight: 320 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>SIGCON</div>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
                                {order.map((id) => {
                                    const m = modById[id];
                                    if (!m) return null;
                                    return (
                                        <li key={id} style={{ padding: '6px 0' }}>
                                            {m.icon && <i className={`${m.icon} me-2`}></i>}
                                            {m.name}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="d-flex gap-2 mt-3">
                    <Button type="primary" onClick={handleSave} disabled={!isDirty || saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button type="secondary" onClick={handleCancel} disabled={!isDirty}>Cancelar</Button>
                    <Button type="danger" onClick={handleReset}>Restablecer Default</Button>
                    {isDirty && <span className="text-warning align-self-center ms-2">⚠ Cambios sin guardar</span>}
                </div>
            </div>
        </div>
    );
};

export default NavegacionPage;
