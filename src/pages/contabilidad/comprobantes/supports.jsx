/**
 * HU-CG-05A/B/C: Modal de gestion de soportes documentales (PDF/JPG/PNG)
 * de un comprobante contable. Permite:
 *   - Subir archivos con tipo (FACTURA/RECIBO/CONTRATO/OTRO) + descripcion.
 *   - Listar adjuntos vigentes con metadatos (tamaño, fecha, usuario).
 *   - Descargar el binario original.
 *   - Eliminar (soft delete).
 *
 * Replica del patron AR-03 (SalesInvoiceAttachment) adaptado al dominio CG.
 */

import { useEffect, useState, useCallback } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const SUPPORT_TYPES = ['FACTURA', 'RECIBO', 'CONTRATO', 'OTRO'];

const SupportsModal = ({ modalRef, journalEntryId, voucherCode, onChange }) => {
    const [supports, setSupports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [supportType, setSupportType] = useState('FACTURA');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // HU-CG-05C E2: visor embebido del soporte (PDF/imagen) sin salir del modal.
    const [viewer, setViewer] = useState(null); // { url, mime, name }

    const reload = useCallback(async () => {
        if (!journalEntryId) return;
        setLoading(true);
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'v1', 'journal-entries', journalEntryId, 'supports']),
                {}, 0
            );
            setSupports(Array.isArray(resp?.data) ? resp.data : []);
        } catch (err) {
            setError(err?.msg || err?.message || 'Error al cargar soportes');
        } finally {
            setLoading(false);
        }
    }, [journalEntryId]);

    useEffect(() => { reload(); }, [reload]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        const file = e.target.elements.file?.files?.[0];
        if (!file) { setError('Seleccione un archivo PDF, JPG o PNG'); return; }
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Tipo de archivo no permitido. Solo se aceptan PDF, JPG o PNG.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('El archivo supera el tamaño maximo permitido (5MB).');
            return;
        }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('supportType', supportType);
            if (description) fd.append('description', description);

            const url = base_url(['api', 'v1', 'journal-entries', journalEntryId, 'supports']);
            const resp = await fetch(url, {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
                body: fd,
            });
            if (!resp.ok) {
                const errBody = await resp.json().catch(() => ({}));
                throw new Error(errBody.message || errBody.error || 'Error al subir el soporte');
            }
            setSuccess('Soporte adjuntado correctamente');
            setDescription('');
            e.target.reset();
            await reload();
            if (onChange) onChange();
        } catch (err) {
            setError(err?.message || 'Error al subir el soporte');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (s) => {
        try {
            const url = base_url(['api', 'v1', 'journal-entries', 'supports', s.id, 'download']);
            const resp = await fetch(url, {
                headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
            });
            if (!resp.ok) throw new Error('Error descargando archivo');
            const blob = await resp.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = s.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        } catch (err) {
            setError(err?.message || 'Error al descargar');
        }
    };

    /**
     * HU-CG-05C E2: visor embebido del soporte. Descarga el binario autenticado,
     * crea un object URL y lo muestra inline (iframe para PDF, img para imagenes)
     * sin forzar la descarga.
     */
    const handleView = async (s) => {
        setError('');
        try {
            const url = base_url(['api', 'v1', 'journal-entries', 'supports', s.id, 'download']);
            const resp = await fetch(url, {
                headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
            });
            if (!resp.ok) throw new Error('Error abriendo el soporte');
            const blob = await resp.blob();
            // Revoca el visor anterior si existe
            if (viewer?.url) URL.revokeObjectURL(viewer.url);
            const objUrl = URL.createObjectURL(blob);
            setViewer({ url: objUrl, mime: s.mimeType || blob.type, name: s.fileName });
        } catch (err) {
            setError(err?.message || 'No se pudo abrir el soporte');
        }
    };

    const closeViewer = () => {
        if (viewer?.url) URL.revokeObjectURL(viewer.url);
        setViewer(null);
    };

    const handleDelete = async (s) => {
        if (!window.confirm(`Eliminar soporte "${s.fileName}"?`)) return;
        try {
            // QA Bloque BG (2026-05-17): firma de fetchHelper.delete es
            // (url, data, headers, time). Pasar `0` como 3er arg lo
            // interpretaba como `headers` (Number) y rompia con
            // 'Cannot create property Authorization on number 0'.
            await fetchHelper.delete(
                base_url(['api', 'v1', 'journal-entries', 'supports', s.id]),
                {}, {}, 0
            );
            setSuccess('Soporte eliminado');
            await reload();
            if (onChange) onChange();
        } catch (err) {
            setError(err?.msg || err?.message || 'Error al eliminar');
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Soportes documentales {voucherCode ? `· ${voucherCode}` : ''}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger alert-dismissible">
                                {error}
                                <button type="button" className="btn-close" onClick={() => setError('')}></button>
                            </div>
                        )}
                        {success && (
                            <div className="alert alert-success alert-dismissible">
                                {success}
                                <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                            </div>
                        )}

                        <form onSubmit={handleUpload} className="mb-3 p-3 border rounded">
                            <h6 className="mb-3">Cargar nuevo soporte</h6>
                            <div className="row g-2 align-items-end">
                                <div className="col-md-3">
                                    <label className="form-label small">Tipo</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={supportType}
                                        onChange={(e) => setSupportType(e.target.value)}
                                    >
                                        {SUPPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label small">Descripcion (opcional)</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={500}
                                        placeholder="Ej. Factura de Acme SAS"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small">Archivo (PDF/JPG/PNG, max 5MB)</label>
                                    <input
                                        type="file"
                                        name="file"
                                        className="form-control form-control-sm"
                                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                        required
                                    />
                                </div>
                                <div className="col-12 mt-3">
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-sm"
                                        disabled={uploading}
                                    >
                                        {uploading ? 'Cargando...' : 'Subir soporte'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <h6 className="mb-2">Soportes adjuntos ({supports.length})</h6>
                        {loading ? (
                            <p className="text-muted small">Cargando...</p>
                        ) : supports.length === 0 ? (
                            <p className="text-muted small fst-italic">
                                Sin soportes adjuntos. Cargue al menos uno para auditoria.
                            </p>
                        ) : (
                            <div className="table-responsive" style={{ maxHeight: 360, overflowY: 'auto' }}>
                                <table className="table table-sm table-bordered align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Archivo</th>
                                            <th>Descripcion</th>
                                            <th className="text-end">Tamaño</th>
                                            <th>Subido por</th>
                                            <th>Fecha</th>
                                            <th className="text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supports.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    <span className="badge bg-label-info">{s.supportType || 'OTRO'}</span>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: '0.78rem' }}>{s.fileName}</code>
                                                    <br />
                                                    <small className="text-muted">{s.mimeType}</small>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>{s.description || '-'}</td>
                                                <td className="text-end">{formatSize(s.fileSize)}</td>
                                                <td><small>{s.uploadedBy || '-'}</small></td>
                                                <td><small>{s.uploadedAt ? new Date(s.uploadedAt).toLocaleString('es-CO') : '-'}</small></td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-label-primary me-1"
                                                        title="Ver soporte"
                                                        onClick={() => handleView(s)}
                                                    >
                                                        <i className="ri-eye-line"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-label-info me-1"
                                                        title="Descargar"
                                                        onClick={() => handleDownload(s)}
                                                    >
                                                        <i className="ri-download-line"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-label-danger"
                                                        title="Eliminar"
                                                        onClick={() => handleDelete(s)}
                                                    >
                                                        <i className="ri-delete-bin-line"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* HU-CG-05C E2: visor embebido del soporte seleccionado */}
                        {viewer && (
                            <div className="mt-3 border rounded p-2">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">
                                        <i className="ri-file-search-line me-1" />
                                        Visor · <code style={{ fontSize: '0.8rem' }}>{viewer.name}</code>
                                    </h6>
                                    <div>
                                        <a className="btn btn-sm btn-label-info me-1" href={viewer.url}
                                           target="_blank" rel="noopener noreferrer" title="Abrir en pestaña nueva">
                                            <i className="ri-external-link-line"></i>
                                        </a>
                                        <button type="button" className="btn btn-sm btn-label-secondary"
                                                onClick={closeViewer} title="Cerrar visor">
                                            <i className="ri-close-line"></i>
                                        </button>
                                    </div>
                                </div>
                                {String(viewer.mime).includes('pdf') ? (
                                    <iframe title="Soporte" src={viewer.url}
                                            style={{ width: '100%', height: 460, border: 'none' }} />
                                ) : String(viewer.mime).startsWith('image/') ? (
                                    <div className="text-center">
                                        <img src={viewer.url} alt={viewer.name}
                                             style={{ maxWidth: '100%', maxHeight: 460, objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <p className="text-muted small mb-0">
                                        Vista previa no disponible para este tipo de archivo. Use Descargar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportsModal;
