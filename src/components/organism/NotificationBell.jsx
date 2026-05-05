import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHelper } from "../../utils/fetch";
import { base_url } from "../../utils/functions";

/**
 * HU-PA-21/22/23: campanita de notificaciones in-app.
 *
 * <p>Polling al endpoint unread-count cada 30s. Click abre el dropdown que
 * carga el listado paginado. Soporta:
 * <ul>
 *   <li>Marcar individual como leida</li>
 *   <li>Marcar todas como leidas</li>
 *   <li>Click navega via action_url + marca leida</li>
 * </ul>
 *
 * <p>Si en el futuro se introduce WebSocket, sustituir el polling por una
 * suscripcion STOMP a /topic/notifications/{userId}.
 */
const NotificationBell = () => {
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const pollRef = useRef(null);

    const loadUnread = async () => {
        try {
            const r = await fetchHelper.get(base_url(['api', 'parametrization', 'notifications', 'unread-count']));
            setUnread(r?.unreadCount ?? 0);
        } catch (_) { /* silencio: no-op si no hay sesion */ }
    };

    const loadList = async () => {
        setLoading(true);
        try {
            const r = await fetchHelper.get(base_url(['api', 'parametrization', 'notifications', 'my']) + '?size=15');
            setItems(r?.data ?? []);
        } catch (_) {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUnread();
        pollRef.current = setInterval(loadUnread, 30000);

        // HU-PA-21 push opcional: si el navegador soporta EventSource, intenta
        // conectar al stream para recibir notificaciones sin esperar al poll.
        // Si falla (proxy, sin token, etc.), seguimos con polling.
        let es = null;
        try {
            const token = localStorage.getItem('token') || '';
            if (window.EventSource && token) {
                const url = base_url(['api', 'parametrization', 'notifications', 'stream']);
                // Pasamos el token via query porque EventSource no permite headers custom.
                // Ajustar SecurityConfig si se requiere validar el token via param.
                // HU-PA-21 push: el browser EventSource NO permite headers custom.
                // El token va en query y SseTokenAuthFilter lo procesa.
                es = new EventSource(url + '?token=' + encodeURIComponent(token), { withCredentials: false });
                es.addEventListener('notification', () => {
                    // Una nueva notif llego: refrescar contador y, si esta abierto, lista.
                    loadUnread();
                    if (open) loadList();
                });
                es.onerror = () => {
                    // No hacemos nada explicito: si falla, polling cada 30s sigue funcionando.
                };
            }
        } catch (_) { /* fallback silencioso */ }

        return () => {
            clearInterval(pollRef.current);
            if (es) try { es.close(); } catch (_) {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next) loadList();
    };

    const onClickItem = async (n) => {
        try {
            const r = await fetchHelper.post(
                base_url(['api', 'parametrization', 'notifications', String(n.id), 'click']), {}
            );
            // Marcar leida en UI antes de navegar
            setItems(prev => prev.map(it => it.id === n.id ? { ...it, read: true } : it));
            await loadUnread();
            const url = r?.actionUrl || n.actionUrl;
            setOpen(false);
            if (url) navigate(url);
        } catch (e) {
            console.error('Error al click notif', e);
        }
    };

    const markAllRead = async (e) => {
        e.stopPropagation();
        try {
            await fetchHelper.patch(base_url(['api', 'parametrization', 'notifications', 'read-all']), {});
            setItems(prev => prev.map(it => ({ ...it, read: true })));
            setUnread(0);
        } catch (err) { console.error(err); }
    };

    const fmtTime = (iso) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'ahora';
            if (diff < 3600) return Math.floor(diff / 60) + ' min';
            if (diff < 86400) return Math.floor(diff / 3600) + ' h';
            return Math.floor(diff / 86400) + ' d';
        } catch { return ''; }
    };

    const sevColor = (s) => s === 'CRITICAL' ? 'danger' : s === 'WARNING' ? 'warning' : 'primary';
    const moduleIcon = (m) => ({
        CG: 'ri-book-2-line', AR: 'ri-bill-line', AP: 'ri-shopping-bag-3-line',
        BNK: 'ri-bank-line', NOM: 'ri-team-line', INT: 'ri-exchange-funds-line',
        AU: 'ri-shield-check-line', PA: 'ri-settings-3-line',
        TER: 'ri-user-line', ACT: 'ri-archive-line', CFG: 'ri-list-settings-line'
    }[m] || 'ri-notification-2-line');

    return (
        <li className={`nav-item dropdown-notifications navbar-dropdown dropdown me-2 me-xl-1 ${open ? 'show' : ''}`}>
            <button
                type="button"
                className="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow"
                onClick={toggleOpen}
                aria-expanded={open}
                style={{ background: 'transparent', border: 'none' }}>
                <i className="ri-notification-2-line ri-22px"></i>
                {unread > 0 && (
                    <span className="position-absolute top-0 start-50 translate-middle-y badge rounded-pill bg-danger"
                        style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>
            {/* Bloque AM (2026-05-03): el panel de notificaciones se cortaba por
                el viewport derecho. dropdown-menu-end alinea el right edge del menu
                con el right edge del trigger. Fix: position absolute con right:0
                explicito + maxWidth dinamico segun viewport, asi nunca se sale del
                lado y se mantiene legible incluso en pantallas medianas. */}
            <ul
                className={`dropdown-menu dropdown-menu-end py-0 ${open ? 'show' : ''}`}
                style={{
                    minWidth: 'min(380px, calc(100vw - 32px))',
                    maxWidth: 'min(420px, calc(100vw - 32px))',
                    right: 0,
                    left: 'auto',
                }}>
                <li className="dropdown-menu-header border-bottom py-50">
                    <div className="dropdown-header d-flex align-items-center py-2">
                        <h6 className="mb-0 me-auto">Notificaciones</h6>
                        <div className="d-flex align-items-center">
                            {unread > 0 && (
                                <span className="badge rounded-pill bg-label-primary fs-xsmall me-2">
                                    {unread} {unread === 1 ? 'nueva' : 'nuevas'}
                                </span>
                            )}
                            {items.length > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-text-secondary rounded-pill btn-icon"
                                    title="Marcar todas como leidas"
                                    onClick={markAllRead}
                                    style={{ background: 'transparent', border: 'none' }}>
                                    <i className="ri-mail-open-line text-heading ri-20px"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </li>
                <li className="dropdown-notifications-list scrollable-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {loading && (
                        <div className="text-center py-4 text-muted">
                            <i className="ri-loader-line ri-spin"></i> Cargando...
                        </div>
                    )}
                    {!loading && items.length === 0 && (
                        <div className="text-center py-4 text-muted">
                            <i className="ri-notification-off-line ri-32px d-block mb-2"></i>
                            <small>No tiene notificaciones</small>
                        </div>
                    )}
                    {!loading && items.length > 0 && (
                        <ul className="list-group list-group-flush">
                            {items.map(n => (
                                <li
                                    key={n.id}
                                    className={`list-group-item list-group-item-action ${n.read ? '' : 'bg-light'}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onClickItem(n)}>
                                    <div className="d-flex">
                                        <div className="flex-shrink-0 me-3">
                                            <span className={`avatar-initial rounded-circle bg-label-${sevColor(n.severity)} d-inline-flex align-items-center justify-content-center`}
                                                style={{ width: '34px', height: '34px' }}>
                                                <i className={`${moduleIcon(n.module)} ri-18px`}></i>
                                            </span>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <h6 className="small mb-1" style={{ wordBreak: 'break-word' }}>{n.title}</h6>
                                                <small className="text-muted ms-2" style={{ whiteSpace: 'nowrap' }}>{fmtTime(n.createdAt)}</small>
                                            </div>
                                            {n.body && (
                                                <small className="d-block text-body" style={{ wordBreak: 'break-word' }}>
                                                    {n.body.length > 120 ? n.body.substring(0, 120) + '...' : n.body}
                                                </small>
                                            )}
                                            <small className="text-muted">
                                                <span className={`badge bg-label-${sevColor(n.severity)} fs-xsmall me-1`}>{n.module}</span>
                                                {n.eventKey}
                                            </small>
                                        </div>
                                        {!n.read && (
                                            <div className="flex-shrink-0">
                                                <span className="badge badge-dot bg-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            </ul>
        </li>
    );
};

export default NotificationBell;
