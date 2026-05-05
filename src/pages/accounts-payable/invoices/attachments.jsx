import { useEffect, useState } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

/**
 * HU-AP-13 (2026-04-28): Modal de Documentos Soporte para una factura de
 * compra. Permite subir, listar, descargar y eliminar archivos PDF/JPG/PNG
 * (max 5MB) clasificados como PURCHASE_ORDER, RECEPTION_ACT, CONTRACT u OTHER.
 */
const AP_ATTACH_TYPES = [
    { id: 'PURCHASE_ORDER', label: 'Orden de compra' },
    { id: 'RECEPTION_ACT', label: 'Acta de recepcion' },
    { id: 'CONTRACT', label: 'Contrato' },
    { id: 'OTHER', label: 'Otro' },
];

const ApAttachmentsModal = ({ modalRef, modalInstance, invoiceId, invoiceNumber }) => {
    const [list, setList] = useState([]);
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('OTHER');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const loadList = async () => {
        if (!invoiceId) return;
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'ap', 'invoices', invoiceId, 'attachments'])
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

    const handleUpload = async () => {
        if (!file) {
            setMessage({ type: 'warning', text: 'Seleccione un archivo' });
            return;
        }
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/xml', 'text/xml'];
        if (!allowed.includes(file.type)) {
            setMessage({ type: 'danger', text: 'Solo se permiten PDF, XML, JPG o PNG' });
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
            formData.append('documentType', docType);
            const token = localStorage.getItem('token');
            const res = await fetch(
                base_url(['api', 'v1', 'ap', 'invoices', invoiceId, 'attachments']),
                {
                    method: 'POST',
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: formData,
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.msg || 'Error cargando archivo');
            }
            setFile(null);
            setMessage({ type: 'success', text: 'Documento adjuntado exitosamente' });
            loadList();
        } catch (error) {
            setMessage({ type: 'danger', text: error?.message || 'Error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (attachmentId, fileName) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                base_url(['api', 'v1', 'ap', 'attachments', attachmentId, 'download']),
                { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
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

    /**
     * HU-AP-12 E4 (Bloque AS): reemplaza un adjunto existente por una version
     * actualizada. Abre file picker, valida MIME y tamaño, y hace POST al
     * endpoint /attachments/{id}/replace. El previo queda historico.
     */
    const handleReplace = async (attachmentId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,application/xml,text/xml,image/jpeg,image/png';
        input.onchange = async (ev) => {
            const f = ev.target.files?.[0];
            if (!f) return;
            const allowed = ['application/pdf','application/xml','text/xml','image/jpeg','image/png'];
            if (!allowed.includes(f.type)) {
                setMessage({ type: 'danger', text: 'Tipo de archivo no permitido. Solo PDF/XML/JPG/PNG.' });
                return;
            }
            if (f.size > 5 * 1024 * 1024) {
                setMessage({ type: 'danger', text: 'Archivo supera 5MB.' });
                return;
            }
            try {
                setLoading(true);
                const formData = new FormData();
                formData.append('file', f);
                const token = localStorage.getItem('token');
                const res = await fetch(
                    base_url(['api', 'v1', 'ap', 'attachments', attachmentId, 'replace']),
                    {
                        method: 'POST',
                        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: formData,
                    }
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.message || err?.msg || 'Error reemplazando');
                }
                setMessage({ type: 'success', text: 'Documento reemplazado correctamente. Nueva version guardada.' });
                loadList();
            } catch (error) {
                setMessage({ type: 'danger', text: error?.message || 'Error' });
            } finally {
                setLoading(false);
            }
        };
        input.click();
    };

    const handleDelete = async (attachmentId) => {
        if (!window.confirm('Eliminar este documento adjunto?')) return;
        try {
            await fetchHelper.delete(
                base_url(['api', 'v1', 'ap', 'attachments', attachmentId])
            );
            setMessage({ type: 'success', text: 'Adjunto eliminado' });
            loadList();
        } catch (error) {
            setMessage({ type: 'danger', text: error?.msg || 'Error' });
        }
    };

    const typeLabel = (id) => AP_ATTACH_TYPES.find(t => t.id === id)?.label || id;

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Documentos soporte - Factura {invoiceNumber || invoiceId}
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
                            <div className="col-md-4">
                                <label className="form-label small">Tipo de documento</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                >
                                    {AP_ATTACH_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-5">
                                <label className="form-label small">Archivo</label>
                                <input
                                    type="file"
                                    accept="application/pdf,application/xml,text/xml,image/jpeg,image/png"
                                    className="form-control form-control-sm"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <small className="text-muted">Max 5MB. PDF/XML/JPG/PNG.</small>
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
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

                        <table className="table table-sm table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>Tipo</th>
                                    <th>Archivo</th>
                                    <th>Tamaño</th>
                                    <th>Cargado</th>
                                    <th style={{width: 110}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.length === 0 && (
                                    <tr><td colSpan="5" className="text-center text-muted">Sin documentos adjuntos</td></tr>
                                )}
                                {list.map((a) => (
                                    <tr key={a.id}>
                                        <td><span className="badge bg-label-info">{typeLabel(a.documentType)}</span></td>
                                        <td>{a.fileName}</td>
                                        <td>{(a.fileSize / 1024).toFixed(1)} KB</td>
                                        <td><small>{a.uploadedAt}</small></td>
                                        <td>
                                            <button type="button" className="btn btn-sm btn-info me-1"
                                                onClick={() => handleDownload(a.id, a.fileName)}
                                                title="Descargar">
                                                <i className="ri-download-line" />
                                            </button>
                                            <button type="button" className="btn btn-sm btn-warning me-1"
                                                onClick={() => handleReplace(a.id)}
                                                title="Reemplazar por nueva version (HU-AP-12 E4)">
                                                <i className="ri-refresh-line" />
                                            </button>
                                            <button type="button" className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(a.id)}
                                                title="Eliminar">
                                                <i className="ri-delete-bin-line" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary"
                            onClick={() => modalInstance?.current?.hide()}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApAttachmentsModal;
