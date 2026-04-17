import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Cierre Contable (CG).
 * Tres secciones: Cierre Mensual, Cierre Anual y Apertura.
 * - Cierre Mensual: POST /api/v1/cg/closing/monthly/preview y POST /api/v1/cg/closing/monthly
 * - Cierre Anual: POST /api/v1/cg/closing/annual
 * - Apertura: POST /api/v1/cg/closing/opening
 */

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined || val === 0) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

/** Genera opciones de anios (ultimos 5 anios + 1 futuro). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= current - 5; y--) {
        years.push(y);
    }
    return years;
};

const CgCierre = () => {
    // Cierre Mensual
    const [mYear, setMYear]           = useState(new Date().getFullYear());
    const [mMonth, setMMonth]         = useState(new Date().getMonth() + 1);
    const [preview, setPreview]       = useState(null);
    const [mLoading, setMLoading]     = useState(false);
    const [mExecLoading, setMExecLoading] = useState(false);

    // Cierre Anual
    const [aYear, setAYear]           = useState(new Date().getFullYear());
    const [aLoading, setALoading]     = useState(false);

    // Apertura
    const [oYear, setOYear]           = useState(new Date().getFullYear());
    const [oLoading, setOLoading]     = useState(false);

    const [message, setMessage]       = useState({ message: '', type: '', show: false });

    /** Previsualiza el cierre mensual. */
    const handleMonthlyPreview = async () => {
        setMLoading(true);
        setPreview(null);
        try {
            const { data, error } = await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'closing', 'monthly', 'preview']),
                { year: mYear, month: mMonth }, {}, 1000, true
            );
            if (!error) {
                setPreview(data);
            } else {
                setMessage({ type: 'danger', show: true, message: 'Error al generar la previsualizacion del cierre.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al previsualizar el cierre mensual.' });
        } finally {
            setMLoading(false);
        }
    };

    /** Ejecuta el cierre mensual. */
    const handleMonthlyClose = async () => {
        const confirm = await window.Swal.fire({
            title: 'Ejecutar cierre mensual',
            html: `¿Esta seguro de ejecutar el cierre mensual para <strong>${mYear}-${String(mMonth).padStart(2, '0')}</strong>? Esta accion cerrara el periodo contable.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, ejecutar cierre',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;

        setMExecLoading(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'closing', 'monthly']),
                { year: mYear, month: mMonth }, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Cierre mensual ejecutado exitosamente.' });
            setPreview(null);
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al ejecutar el cierre mensual.' });
        } finally {
            setMExecLoading(false);
        }
    };

    /** Ejecuta el cierre anual. */
    const handleAnnualClose = async () => {
        const confirm = await window.Swal.fire({
            title: 'Ejecutar cierre anual',
            html: `¿Esta seguro de ejecutar el cierre anual para el año <strong>${aYear}</strong>? Esta accion cerrara todas las cuentas de resultado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, ejecutar cierre',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;

        setALoading(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'closing', 'annual']),
                { year: aYear }, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Cierre anual ejecutado exitosamente.' });
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al ejecutar el cierre anual.' });
        } finally {
            setALoading(false);
        }
    };

    /** Genera el asiento de apertura. */
    const handleOpening = async () => {
        const confirm = await window.Swal.fire({
            title: 'Generar asiento de apertura',
            html: `¿Esta seguro de generar el asiento de apertura para el año <strong>${oYear}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Si, generar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
        });
        if (!confirm.isConfirmed) return;

        setOLoading(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'closing', 'opening']),
                { year: oYear }, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Asiento de apertura generado exitosamente.' });
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al generar el asiento de apertura.' });
        } finally {
            setOLoading(false);
        }
    };

    /** Renderiza la tabla de previsualizacion del cierre mensual. */
    const renderPreview = () => {
        if (!preview) return null;

        const items = Array.isArray(preview) ? preview : (preview?.lines || preview?.entries || preview?.data || []);

        if (items.length === 0) {
            return <div className="text-muted mt-3">No hay movimientos para previsualizar en este periodo.</div>;
        }

        return (
            <div className="table-responsive mt-3">
                <h6 className="fw-bold mb-2">Previsualizacion del cierre</h6>
                <table className="table table-bordered table-sm table-striped">
                    <thead className="table-light">
                        <tr>
                            <th>Cuenta</th>
                            <th>Concepto</th>
                            <th className="text-end">Debito</th>
                            <th className="text-end">Credito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.accountCode || '-'}</td>
                                <td>{item.concept || item.description || item.accountName || '-'}</td>
                                <td className="text-end">{formatCurrency(item.debit)}</td>
                                <td className="text-end">{formatCurrency(item.credit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Cierre Contable</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Seccion 1: Cierre Mensual */}
                <div className="border rounded p-3 mb-4">
                    <h6 className="fw-bold mb-3">
                        <i className="ri-calendar-check-line me-2" />Cierre Mensual
                    </h6>
                    <div className="row">
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Año</label>
                            <select className="form-select" value={mYear} onChange={e => setMYear(Number(e.target.value))}>
                                {getYearOptions().map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Mes</label>
                            <select className="form-select" value={mMonth} onChange={e => setMMonth(Number(e.target.value))}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6 mb-2 d-flex align-items-end gap-2">
                            <button className="btn btn-outline-primary" onClick={handleMonthlyPreview} disabled={mLoading}>
                                {mLoading ? <><span className="spinner-border spinner-border-sm me-1" />Cargando...</> : <><i className="ri-eye-line me-1" />Previsualizar</>}
                            </button>
                            <button className="btn btn-danger" onClick={handleMonthlyClose} disabled={mExecLoading}>
                                {mExecLoading ? <><span className="spinner-border spinner-border-sm me-1" />Procesando...</> : <><i className="ri-lock-line me-1" />Ejecutar Cierre</>}
                            </button>
                        </div>
                    </div>
                    {renderPreview()}
                </div>

                {/* Seccion 2: Cierre Anual */}
                <div className="border rounded p-3 mb-4">
                    <h6 className="fw-bold mb-3">
                        <i className="ri-calendar-2-line me-2" />Cierre Anual
                    </h6>
                    <div className="row">
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Año</label>
                            <select className="form-select" value={aYear} onChange={e => setAYear(Number(e.target.value))}>
                                {getYearOptions().map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 mb-2 d-flex align-items-end">
                            <button className="btn btn-danger" onClick={handleAnnualClose} disabled={aLoading}>
                                {aLoading ? <><span className="spinner-border spinner-border-sm me-1" />Procesando...</> : <><i className="ri-lock-line me-1" />Ejecutar Cierre Anual</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Seccion 3: Apertura */}
                <div className="border rounded p-3">
                    <h6 className="fw-bold mb-3">
                        <i className="ri-file-add-line me-2" />Asiento de Apertura
                    </h6>
                    <div className="row">
                        <div className="col-md-3 mb-2">
                            <label className="form-label">Año</label>
                            <select className="form-select" value={oYear} onChange={e => setOYear(Number(e.target.value))}>
                                {getYearOptions().map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 mb-2 d-flex align-items-end">
                            <button className="btn btn-success" onClick={handleOpening} disabled={oLoading}>
                                {oLoading ? <><span className="spinner-border spinner-border-sm me-1" />Generando...</> : <><i className="ri-file-add-line me-1" />Generar Apertura</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CgCierre;
