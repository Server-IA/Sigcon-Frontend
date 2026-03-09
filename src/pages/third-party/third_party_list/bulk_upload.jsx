import { useState, useRef, useCallback } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

// TODO: Actualizar URL cuando el backend provea el endpoint
const API_BULK_UPLOAD = ['thirdParty', 'bulkUpload'];

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'ri-file-text-line';
    if (ext === 'xlsx' || ext === 'xls') return 'ri-file-excel-2-line';
    return 'ri-file-line';
};

const validateExtension = (fileName) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return 'Formato no válido. Solo se aceptan archivos CSV o XLSX.';
    }
    return null;
};

// ─── Estados del flujo ─────────────────────────────────────────────────────────
// idle → reading → ready → uploading → done
//                        ↘ error
const STATES = {
    IDLE: 'idle',
    READING: 'reading',
    READY: 'ready',
    UPLOADING: 'uploading',
    DONE: 'done',
    ERROR: 'error',
};

// ─── Componente ────────────────────────────────────────────────────────────────
const BulkUploadThirdParty = ({ modalRef, modalInstance, dataTableRef, onSuccess }) => {

    const fileInputRef = useRef(null);

    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [flowState, setFlowState] = useState(STATES.IDLE);
    const [base64Data, setBase64Data] = useState('');
    const [report, setReport] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Reset ──────────────────────────────────────────────────────────────────
    const resetState = () => {
        setFile(null);
        setFlowState(STATES.IDLE);
        setBase64Data('');
        setReport(null);
        setErrorMsg('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Lectura del archivo → base64 ───────────────────────────────────────────
    const readFileAsBase64 = (f) => {
        setFlowState(STATES.READING);
        const reader = new FileReader();

        reader.onload = (e) => {
            // e.target.result = "data:<mime>;base64,<DATA>"
            // Separamos el prefijo y guardamos sólo los datos en base64
            const raw = e.target.result;
            const b64 = raw.split(',')[1];
            if (!b64) {
                setFlowState(STATES.ERROR);
                setErrorMsg('El archivo parece estar vacío o dañado.');
                return;
            }
            setBase64Data(b64);
            setFlowState(STATES.READY);
        };

        reader.onerror = () => {
            setFlowState(STATES.ERROR);
            setErrorMsg('Error al leer el archivo. Intente nuevamente.');
        };

        // readAsDataURL lee el archivo completo antes de disparar onload,
        // garantizando que no se permita subir un archivo parcial.
        reader.readAsDataURL(f);
    };

    // ── Procesamiento del archivo recibido ────────────────────────────────────
    const handleFile = (f) => {
        setReport(null);
        setErrorMsg('');
        const validationError = validateExtension(f.name);
        if (validationError) {
            setErrorMsg(validationError);
            setFlowState(STATES.ERROR);
            return;
        }
        setFile(f);
        readFileAsBase64(f);
    };

    // ── Eventos drag & drop ────────────────────────────────────────────────────
    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) handleFile(dropped);
    }, []);

    const onDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const onDragLeave = () => setDragOver(false);

    const onFileInputChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) handleFile(selected);
    };

    // ── Envío al backend ───────────────────────────────────────────────────────
    const handleUpload = async () => {
        // El botón sólo se habilita cuando flowState === READY y base64Data existe,
        // lo que garantiza que el archivo fue leído completamente.
        if (flowState !== STATES.READY || !base64Data) return;

        setFlowState(STATES.UPLOADING);
        setErrorMsg('');

        try {
            const url = base_url(API_BULK_UPLOAD);
            const payload = {
                fileName: file.name,
                fileBase64: base64Data,   // archivo completo codificado en base64
                encoding: 'UTF-8',
                delimiter: ',',
            };

            const { data, error } = await fetchHelper.post(url, payload, {}, 500, false);

            if (error) throw new Error(error);

            setReport(data);
            setFlowState(STATES.DONE);
            dataTableRef?.current?.ajax?.reload?.();
            onSuccess?.();
        } catch (err) {
            console.error(err);
            setFlowState(STATES.ERROR);
            setErrorMsg('Error al cargar el archivo en el servidor. Verifique su conexión e intente nuevamente.');
        }
    };

    // ── Renderizado ────────────────────────────────────────────────────────────
    const isDropZoneVisible = flowState === STATES.IDLE || flowState === STATES.ERROR;
    const isFileCardVisible = flowState === STATES.READY || flowState === STATES.UPLOADING;
    const canUpload = flowState === STATES.READY;
    const isLoading = flowState === STATES.READING || flowState === STATES.UPLOADING;

    return (
        <div
            className="modal fade"
            ref={modalRef}
            tabIndex={-1}
            aria-hidden="true"
            data-bs-backdrop="static"
        >
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">

                    {/* Header */}
                    <div className="modal-header">
                        <h4 className="modal-title fw-bold">
                            <i className="ri-upload-cloud-2-line me-2 text-primary"></i>
                            Cargar Plantilla
                        </h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                            onClick={resetState}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body">

                        {/* Banner informativo */}
                        <div className="alert alert-info d-flex gap-2 align-items-start mb-4" role="alert">
                            <i className="ri-information-line fs-5 mt-1 flex-shrink-0"></i>
                            <div className="small">
                                <strong>Formato requerido:</strong> CSV o XLSX con columnas:
                                <code className="ms-1">NIT, nombre/razón_social, país, dirección, email, estado, tipo_tercero</code>.
                                Máximo <strong>10,000 registros</strong> por archivo. El archivo se convierte
                                a Base64 garantizando integridad total antes del envío.
                            </div>
                        </div>

                        {/* ── Zona de drop ── */}
                        {isDropZoneVisible && (
                            <div
                                className={`rounded-3 d-flex flex-column align-items-center justify-content-center p-5 mb-3 ${
                                    dragOver
                                        ? 'border border-primary bg-primary bg-opacity-10'
                                        : 'border border-secondary bg-light'
                                }`}
                                style={{ borderStyle: 'dashed', borderWidth: '2px', minHeight: '180px', cursor: 'pointer' }}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <i
                                    className={`ri-upload-cloud-2-line fs-1 mb-2 ${dragOver ? 'text-primary' : 'text-secondary'}`}
                                ></i>
                                <p className={`mb-1 fw-semibold ${dragOver ? 'text-primary' : 'text-secondary'}`}>
                                    Arrastra o suelta el archivo aquí
                                </p>
                                <p className="text-muted small mb-0">o haz clic para seleccionar</p>
                                <p className="text-muted small mb-0">.CSV · .XLSX</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="d-none"
                                    onChange={onFileInputChange}
                                />
                            </div>
                        )}

                        {/* ── Leyendo archivo ── */}
                        {flowState === STATES.READING && (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5">
                                <div className="spinner-border text-primary mb-3" role="status" />
                                <p className="text-muted mb-0">Leyendo archivo y generando Base64...</p>
                            </div>
                        )}

                        {/* ── Tarjeta de archivo listo / subiendo ── */}
                        {isFileCardVisible && file && (
                            <div className="d-flex align-items-center gap-3 border rounded-3 p-3 mb-3 bg-light">
                                <i className={`${getFileIcon(file.name)} fs-2 text-success`}></i>
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="fw-semibold mb-0 text-truncate">{file.name}</p>
                                    <small className="text-muted">{formatSize(file.size)}</small>
                                </div>
                                {flowState === STATES.UPLOADING ? (
                                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger flex-shrink-0"
                                        onClick={resetState}
                                        title="Quitar archivo"
                                    >
                                        <i className="ri-delete-bin-line"></i>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Progreso de carga ── */}
                        {flowState === STATES.UPLOADING && (
                            <div className="progress mb-3" style={{ height: '6px' }}>
                                <div
                                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                                    style={{ width: '100%' }}
                                ></div>
                            </div>
                        )}

                        {/* ── Reporte de resultado ── */}
                        {flowState === STATES.DONE && report && (
                            <div className="mt-2">
                                <div className="alert alert-success d-flex gap-2 align-items-center mb-3">
                                    <i className="ri-checkbox-circle-line fs-5"></i>
                                    <strong>Carga completada exitosamente</strong>
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-6 col-md-3">
                                        <div className="card border text-center py-3 px-2">
                                            <p className="fs-4 fw-bold text-primary mb-0">{report.total_procesados ?? 0}</p>
                                            <small className="text-muted">Procesados</small>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="card border text-center py-3 px-2">
                                            <p className="fs-4 fw-bold text-success mb-0">{report.exitosos ?? 0}</p>
                                            <small className="text-muted">Exitosos</small>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="card border text-center py-3 px-2">
                                            <p className="fs-4 fw-bold text-danger mb-0">{report.errores ?? 0}</p>
                                            <small className="text-muted">Con errores</small>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <div className="card border text-center py-3 px-2">
                                            <p className="fs-5 fw-bold text-secondary mb-0">
                                                {report.tiempo_procesamiento ?? '-'}
                                            </p>
                                            <small className="text-muted">Tiempo</small>
                                        </div>
                                    </div>
                                </div>
                                {report.archivo_resultado && (
                                    <p className="text-muted small mb-0">
                                        <i className="ri-file-download-line me-1"></i>
                                        Reporte generado: <strong>{report.archivo_resultado}</strong>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── Mensaje de error ── */}
                        {errorMsg && (
                            <div className="alert alert-danger d-flex gap-2 align-items-center mt-3 mb-0">
                                <i className="ri-error-warning-line fs-5 flex-shrink-0"></i>
                                <span>{errorMsg}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={resetState}
                            disabled={isLoading}
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={!canUpload}
                        >
                            {flowState === STATES.UPLOADING ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                                    Cargando...
                                </>
                            ) : (
                                <>
                                    <i className="ri-upload-cloud-2-line me-2"></i>
                                    Cargar Archivo
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal"
                            onClick={resetState}
                            disabled={isLoading}
                        >
                            Cerrar
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BulkUploadThirdParty;
