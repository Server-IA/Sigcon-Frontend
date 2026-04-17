import { useEffect, useRef, useState, useCallback } from 'react';

import { fetchHelper } from '../../utils/fetch';

const DropzoneModal = ({
    modalRef,
    title = 'Cargue Masivo',
    uploadUrl,
    acceptedFiles = '.xlsx,.xls,.csv',
    maxFilesize = 5,
    fileFieldName = 'fileBase64',
    fileNameField = 'fileName',
    onSuccess,
    onError,
    templateColumns = null,
    templateFileName = 'plantilla.csv',
}) => {

    const inputRef = useRef(null);

    const [alert, setAlert]           = useState({ text: '', type: '' });
    const [dragOver, setDragOver]     = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading]       = useState(false);

    // Limpiar estado al cerrar el modal
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onHide = () => {
            setAlert({ text: '', type: '' });
            setSelectedFile(null);
            setLoading(false);
            if (inputRef.current) inputRef.current.value = '';
        };

        el.addEventListener('hidden.bs.modal', onHide);
        return () => el.removeEventListener('hidden.bs.modal', onHide);
    }, [modalRef]);

    const isValidFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const allowed = acceptedFiles.split(',').map(e => e.trim().replace('.', '').toLowerCase());

        if (!allowed.includes(ext)) {
            setAlert({ text: 'Tipo de archivo no permitido.', type: 'danger' });
            return false;
        }
        if (file.size > maxFilesize * 1024 * 1024) {
            setAlert({ text: `El archivo supera el límite de ${maxFilesize} MB.`, type: 'danger' });
            return false;
        }
        return true;
    };

    const handleFile = (file) => {
        if (!file) return;
        setAlert({ text: '', type: '' });
        if (!isValidFile(file)) return;
        setSelectedFile(file);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
    }, [acceptedFiles, maxFilesize]);

    const handleInputChange = (e) => handleFile(e.target.files?.[0]);

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]); // solo la parte base64
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleUpload = async () => {
        if (!selectedFile) {
            setAlert({ text: 'Seleccione un archivo para continuar.', type: 'warning' });
            return;
        }

        try {
            setLoading(true);
            setAlert({ text: '', type: '' });

            const base64  = await toBase64(selectedFile);
            const payload = {
                [fileFieldName]: base64,
                [fileNameField]: selectedFile.name,
            };

            const response = await fetchHelper.post(uploadUrl, payload, {}, 1000);

            setAlert({ text: response?.msg || 'Archivo procesado exitosamente.', type: 'success' });
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = '';
            onSuccess?.(response);

        } catch (error) {
            const text = error?.msg ?? 'Error al procesar el archivo.';
            setAlert({ text, type: 'danger' });
            onError?.(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">{title}</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">

                        {alert.text && (
                            <div className={`alert alert-${alert.type} alert-dismissible mb-3`} role="alert">
                                {alert.text}
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setAlert({ text: '', type: '' })}
                                />
                            </div>
                        )}

                        {/* FE-FUNC-HU-TER-07-01: Botón de descarga de plantilla */}
                        {templateColumns && (
                            <div className="mb-3 text-center">
                                <button
                                    type="button"
                                    className="btn btn-outline-info btn-sm"
                                    onClick={() => {
                                        const csv = templateColumns.join(',') + '\n';
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url; a.download = templateFileName; a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    <i className="ri-download-line me-1"></i>Descargar plantilla CSV
                                </button>
                                <small className="d-block text-muted mt-1">
                                    Columnas requeridas: {templateColumns.join(', ')}
                                </small>
                            </div>
                        )}

                        {/* Zona de arrastre */}
                        <div
                            className={`border border-2 rounded p-5 text-center ${dragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                            style={{
                                cursor: 'pointer',
                                minHeight: '180px',
                                borderStyle: 'dashed',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <i
                                className={`ri-upload-cloud-2-line ${dragOver ? 'text-primary' : 'text-muted'}`}
                                style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}
                            />

                            {selectedFile ? (
                                <>
                                    <p className="mb-1 fw-semibold text-success">
                                        <i className="ri-file-excel-2-line me-1" />
                                        {selectedFile.name}
                                    </p>
                                    <small className="text-muted">
                                        {(selectedFile.size / 1024).toFixed(1)} KB — listo para cargar
                                    </small>
                                </>
                            ) : (
                                <>
                                    <p className="mb-1">
                                        Arrastra el archivo aquí o <strong>haz clic para seleccionar</strong>
                                    </p>
                                    <small className="text-muted">
                                        Formatos: {acceptedFiles} &bull; Máx. {maxFilesize} MB
                                    </small>
                                </>
                            )}

                            <input
                                ref={inputRef}
                                type="file"
                                accept={acceptedFiles}
                                className="d-none"
                                onChange={handleInputChange}
                            />
                        </div>

                    </div>

                    <div className="modal-footer d-flex justify-content-between">
                        <button
                            type="button"
                            className="btn btn-primary waves-effect waves-light"
                            onClick={handleUpload}
                            disabled={loading || !selectedFile}
                        >
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Procesando...</>
                                : <><i className="ri-upload-2-line me-1" /> Cargar archivo</>
                            }
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal"
                            disabled={loading}
                        >
                            Cerrar
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DropzoneModal;
