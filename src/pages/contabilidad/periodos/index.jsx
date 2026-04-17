import { useState, useEffect, useRef } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import CreatePeriodo from './create';

/**
 * Pagina principal de Periodos Contables (CG).
 * Usa GET /api/v1/accounting-periods para listar todos los periodos
 * y permite crear, cerrar, bloquear y reabrir periodos.
 */

/** Colores de badge por estado de periodo. */
const STATUS_BADGE = {
    OPEN:   'bg-label-success',
    CLOSED: 'bg-label-warning',
    LOCKED: 'bg-label-danger',
};

/** Etiquetas en espanol por estado. */
const STATUS_LABEL = {
    OPEN:   'Abierto',
    CLOSED: 'Cerrado',
    LOCKED: 'Bloqueado',
};

/** Nombres de meses en espanol. */
const MONTH_NAMES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const IndexCgPeriodos = () => {
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);

    const [periods, setPeriods]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [message, setMessage]   = useState({ message: '', type: '', show: false });

    /** Carga la lista de periodos contables desde el backend. */
    const loadPeriods = async () => {
        setLoading(true);
        try {
            const { data, error } = await fetchHelper.get(
                base_url(['api', 'v1', 'accounting-periods']), {}, 0
            );
            if (!error && Array.isArray(data)) {
                setPeriods(data);
            } else if (!error && data?.data && Array.isArray(data.data)) {
                setPeriods(data.data);
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: 'Error al cargar los periodos contables.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPeriods(); }, []);

    /** Abre modal de creacion de periodo. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Cierra un periodo contable (OPEN -> CLOSED). */
    const handleClose = async (period) => {
        const confirm = await window.Swal.fire({
            title: 'Cerrar periodo',
            html: `¿Esta seguro de cerrar el periodo <strong>${period.year}-${String(period.month).padStart(2, '0')}</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, cerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-periods', period.id, 'close']),
                {}, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Periodo cerrado exitosamente.' });
            loadPeriods();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al cerrar el periodo.' });
        }
    };

    /** Bloquea un periodo contable (CLOSED -> LOCKED). */
    const handleLock = async (period) => {
        const confirm = await window.Swal.fire({
            title: 'Bloquear periodo',
            html: `¿Esta seguro de bloquear el periodo <strong>${period.year}-${String(period.month).padStart(2, '0')}</strong>? Esta accion es irreversible.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, bloquear',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-periods', period.id, 'lock']),
                {}, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Periodo bloqueado exitosamente.' });
            loadPeriods();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al bloquear el periodo.' });
        }
    };

    /** Reabre un periodo contable (CLOSED -> OPEN). */
    const handleReopen = async (period) => {
        const confirm = await window.Swal.fire({
            title: 'Reabrir periodo',
            html: `¿Esta seguro de reabrir el periodo <strong>${period.year}-${String(period.month).padStart(2, '0')}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Si, reabrir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-periods', period.id, 'reopen']),
                {}, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Periodo reabierto exitosamente.' });
            loadPeriods();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al reabrir el periodo.' });
        }
    };

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center d-flex justify-content-between align-items-center">
                    Periodos Contables
                    <button className="btn rounded-pill btn-primary waves-effect" onClick={openModalCreate}>
                        <i className="ri-add-line ri-16px me-sm-2" />
                        <span className="d-none d-sm-inline-block">Crear Periodo</span>
                    </button>
                </h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-body">
                    {loading ? (
                        <div className="text-center py-4">
                            <span className="spinner-border spinner-border-sm me-2" />Cargando periodos...
                        </div>
                    ) : periods.length === 0 ? (
                        <div className="text-center py-4 text-muted">No hay periodos contables registrados.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Id</th>
                                        <th>Año</th>
                                        <th>Mes</th>
                                        <th>Estado</th>
                                        <th>Fecha Cierre</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.id}</td>
                                            <td>{p.year}</td>
                                            <td>{MONTH_NAMES[p.month] || p.month}</td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[p.status] || 'bg-label-secondary'}`}>
                                                    {STATUS_LABEL[p.status] || p.status}
                                                </span>
                                            </td>
                                            <td>{p.closedAt || p.lockedAt || '-'}</td>
                                            <td>
                                                <div className="d-flex gap-1 flex-wrap">
                                                    {p.status === 'OPEN' && (
                                                        <button className="btn btn-sm btn-label-warning"
                                                            onClick={() => handleClose(p)} title="Cerrar periodo">
                                                            <i className="ri-lock-line" /> Cerrar
                                                        </button>
                                                    )}
                                                    {p.status === 'CLOSED' && (
                                                        <>
                                                            <button className="btn btn-sm btn-label-danger"
                                                                onClick={() => handleLock(p)} title="Bloquear periodo">
                                                                <i className="ri-shield-check-line" /> Bloquear
                                                            </button>
                                                            <button className="btn btn-sm btn-label-success"
                                                                onClick={() => handleReopen(p)} title="Reabrir periodo">
                                                                <i className="ri-lock-unlock-line" /> Reabrir
                                                            </button>
                                                        </>
                                                    )}
                                                    {p.status === 'LOCKED' && (
                                                        <span className="text-muted small">Sin acciones disponibles</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <CreatePeriodo
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                onCreated={() => {
                    setMessage({ type: 'success', show: true, message: 'Periodo creado exitosamente.' });
                    loadPeriods();
                }}
            />
        </>
    );
};

export default IndexCgPeriodos;
