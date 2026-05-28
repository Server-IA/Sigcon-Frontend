import { useEffect, useState } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

/**
 * Formatea un ISO timestamp a "YYYY-MM-DD HH:mm" legible.
 * El backend devuelve algo como "2026-05-28T15:59:57.354523"; mostrar el ISO
 * crudo ensancha la columna CARGADO (no tiene punto de quiebre) y desborda
 * la tabla fuera del modal.
 */
const fmtDate = (iso) => {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
            + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) {
        return iso;
    }
};

/**
 * Convierte el MIME crudo (ej. "application/pdf") en una etiqueta corta
 * (PDF / JPG / PNG). El MIME crudo, al contener "/", tampoco tiene punto de
 * quiebre wrappable y contribuye al desborde de la tabla.
 */
const fmtMime = (mime) => {
    if (!mime) return '-';
    const m = String(mime).toLowerCase();
    if (m.includes('pdf')) return 'PDF';
    if (m.includes('jpeg') || m.includes('jpg')) return 'JPG';
    if (m.includes('png')) return 'PNG';
    return mime;
};

/**
 * Modal de Comprobantes Adjuntos para una factura de venta.
 * Cubre HU AR-03: permite cargar, listar, descargar y eliminar
 * comprobantes (PDF/JPG/PNG, max 5MB) asociados a una factura.
 */
const AttachmentsModal = ({ modalRef, modalInstance, invoiceId, invoiceNumber }) => {
    const [list, setList] = useState([]);
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    /** Carga los adjuntos de la factura. */
    const loadList = async () => {
        if (!invoiceId) return;
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'ar', 'invoices', invoiceId, 'attachments'])
            );
            setList(res?.data || []);
        } catch (error) {
            setMessage({ type: 'danger', text: error?.msg || 'Error cargando adjuntos' });
        }
    };

    useEffect(() => {
        if (invoiceId) loadList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    /** Sube el archivo seleccionado. */
    const handleUpload = async () => {
        if (!file) {
            setMessage({ type: 'warning', text: 'Seleccione un archivo' });
            return;
        }
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowed.includes(file.type)) {
            setMessage({ type: 'danger', text: 'Solo se permiten PDF, JPG o PNG' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'danger', text: 'El archivo supera los 5MB permitidos' });
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const res = await fetch(
                base_url(['api', 'v1', 'ar', 'invoices', invoiceId, 'attachments']),
                {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.msg || 'Error cargando archivo');
            }
            setFile(null);
            setMessage({ type: 'success', text: 'Comprobante cargado' });
            loadList();
        } catch (error) {
            setMessage({ type: 'danger', text: error?.message || 'Error' });
        } finally {
            setLoading(false);
        }
    };

    /** Descarga un adjunto. */
    const handleDownload = async (attachmentId, fileName) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                base_url(['api', 'v1', 'ar', 'attachments', attachmentId, 'download']),
                {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                }
            );
            if (!res.ok) throw new Error('Error al descargar');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || `adjunto_${attachmentId}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setMessage({ type: 'danger', text: error?.message || 'Error descargando' });
        }
    };

    /** Elimina un adjunto. */
    const handleDelete = async (attachmentId) => {
        if (!window.confirm('Eliminar este comprobante?')) return;
        try {
            await fetchHelper.delete(
                base_url(['api', 'v1', 'ar', 'attachments', attachmentId])
            );
            setMessage({ type: 'success', text: 'Adjunto eliminado' });
            loadList();
        } catch (error) {
            setMessage({ type: 'danger', text: error?.msg || 'Error' });
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Comprobantes - {invoiceNumber || 'Factura'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => modalInstance?.current?.hide()}
                        />
                    </div>
                    <div className="modal-body">
                        {message.text && (
                            <div className={`alert alert-${message.type}`}>{message.text}</div>
                        )}
                        <div className="row g-2 mb-3">
                            <div className="col-md-8">
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    className="form-control"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <small className="text-muted">Max 5MB. Solo PDF/JPG/PNG.</small>
                            </div>
                            <div className="col-md-4">
                                <button
                                    type="button"
                                    className="btn btn-primary w-100"
                                    onClick={handleUpload}
                                    disabled={loading || !file}
                                >
                                    <i className="ri-upload-line me-1" />
                                    {loading ? 'Cargando...' : 'Adjuntar'}
                                </button>
                            </div>
                        </div>

                        {/*
                         * `table-responsive` garantiza que la tabla quede
                         * contenida dentro del modal (scroll horizontal si
                         * algun contenido excede el ancho). Sin este wrapper,
                         * MIME crudo (application/pdf) + ISO timestamp largo
                         * desbordaban el header y los botones por la derecha.
                         */}
                        <div className="table-responsive">
                            <table className="table table-sm table-striped mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Archivo</th>
                                        <th>Tipo</th>
                                        <th>Tamaño</th>
                                        <th>Cargado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.length === 0 && (
                                        <tr><td colSpan="5" className="text-center">Sin comprobantes</td></tr>
                                    )}
                                    {list.map((a) => (
                                        <tr key={a.id}>
                                            <td style={{ wordBreak: 'break-word' }}>{a.fileName}</td>
                                            <td>{fmtMime(a.mimeType)}</td>
                                            <td>{(a.fileSize / 1024).toFixed(1)} KB</td>
                                            <td>{fmtDate(a.uploadedAt)}</td>
                                            <td className="text-nowrap">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-info me-1"
                                                    onClick={() => handleDownload(a.id, a.fileName)}
                                                    title="Descargar"
                                                >
                                                    <i className="ri-download-line" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(a.id)}
                                                    title="Eliminar"
                                                >
                                                    <i className="ri-delete-bin-line" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => modalInstance?.current?.hide()}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttachmentsModal;
