import { useState, useEffect, useRef } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ACCOUNT_CLASSES = [
    { id: 'ASSET', label: 'Activo' },
    { id: 'LIABILITY', label: 'Pasivo' },
    { id: 'EQUITY', label: 'Patrimonio' },
    { id: 'INCOME', label: 'Ingresos' },
    { id: 'EXPENSE', label: 'Gastos' },
    { id: 'COST_OF_SALES', label: 'Costos de venta' },
    { id: 'COST_OF_PRODUCTION', label: 'Costos de producción o de operación' },
    { id: 'ORDER_DEBIT', label: 'Cuentas de orden deudoras' },
    { id: 'ORDER_CREDIT', label: 'Cuentas de orden acreedoras' },
];

const HIERARCHY_LEVELS = [
    { id: 'GROUP', label: 'Grupo' },
    { id: 'SUBGROUP', label: 'Subgrupo' },
];

const ACCOUNT_NATURES = [
    { id: 'DEBIT', label: 'Deudora' },
    { id: 'CREDIT', label: 'Acreedora' },
];

// ─── Componente principal ───────────────────────────────────────────────────────
const CreatePUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setPucCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    // ── Cargue masivo ──
    const dropzoneRef = useRef(null);
    const dzInstance = useRef(null);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploading, setUploading] = useState(false);

    // Limpiar errores cuando cambia el account (modal se reabre)
    useEffect(() => {
        setErrors({});
        setErrorMessage('');
        setUploadError('');
        setUploadSuccess('');
    }, [account]);

    // ── Inicializar Dropzone ──
    useEffect(() => {
        if (!dropzoneRef.current) return;
        if (typeof window.Dropzone === 'undefined') return;

        if (dzInstance.current) {
            dzInstance.current.destroy();
            dzInstance.current = null;
        }

        window.Dropzone.autoDiscover = false;

        dzInstance.current = new window.Dropzone(dropzoneRef.current, {
            url: base_url(['chartOfAccounts', 'bulk']),
            acceptedFiles: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            maxFiles: 1,
            maxFilesize: 10,
            autoProcessQueue: false,
            addRemoveLinks: true,
            dictDefaultMessage: 'Arrastra un archivo .xlsx aquí o haz clic para seleccionarlo',
            dictRemoveFile: 'Quitar archivo',
            dictMaxFilesExceeded: 'Solo se permite un archivo a la vez',
            dictInvalidFileType: 'Solo se permiten archivos .xlsx',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            init: function () {
                this.on('addedfile', () => {
                    setUploadError('');
                    setUploadSuccess('');
                });
                this.on('success', (file) => {
                    setUploadSuccess('El archivo fue cargado exitosamente. Las cuentas han sido importadas.');
                    setUploading(false);
                    dataTableRef?.current?.ajax.reload();
                    this.removeFile(file);
                });
                this.on('error', (file, message) => {
                    setUploadError(typeof message === 'string' ? message : 'Error al procesar el archivo. Verifique el formato.');
                    setUploading(false);
                    this.removeFile(file);
                });
            }
        });

        return () => {
            if (dzInstance.current) {
                dzInstance.current.destroy();
                dzInstance.current = null;
            }
        };
    }, []);

    // ── Enviar formulario manual ──
    const handleCreate = async () => {
        try {
            const url = base_url(['chartOfAccounts']);
            await fetchHelper.post(url, account, {}, 1000);

            setAccount({
                id: '',
                idPuc: null,
                code: '',
                name: '',
                description: '',
                accountClass: '',
                hierarchyLevel: '',
                nature: '',
                status: 'ACTIVE',
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setPucCreate(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al crear cuenta PUC:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    // ── Enviar cargue masivo ──
    const handleBulkUpload = () => {
        if (!dzInstance.current) return;

        const files = dzInstance.current.getQueuedFiles();
        if (files.length === 0) {
            setUploadError('Por favor seleccione un archivo .xlsx antes de cargar.');
            return;
        }

        setUploading(true);
        setUploadError('');
        setUploadSuccess('');
        dzInstance.current.processQueue();
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Crear Cuenta PUC</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* ── Tabs ── */}
                        <ul className="nav nav-tabs mb-4" id="tabCreatePUC" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link active"
                                    id="tab-form-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#tab-form"
                                    type="button"
                                    role="tab"
                                >
                                    <i className="ri-file-text-line me-1"></i> Registro manual
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link"
                                    id="tab-bulk-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#tab-bulk"
                                    type="button"
                                    role="tab"
                                >
                                    <i className="ri-upload-2-line me-1"></i> Cargue masivo (.xlsx)
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content" id="tabCreatePUCContent">

                            {/* ══════════════════════════════════
                                TAB 1 — Formulario manual
                            ══════════════════════════════════ */}
                            <div className="tab-pane fade show active" id="tab-form" role="tabpanel">

                                {/* Alert error general */}
                                <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                                    <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                                    <span>{errorMessage}</span>
                                </div>

                                {/* Código + Nombre */}
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="puc_code"
                                            label="Código de la cuenta"
                                            value={account.code}
                                            onChange={(e) => setAccount({ ...account, code: e.target.value })}
                                            error={errors.code}
                                            placeholder="Ej. 1105"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="puc_name"
                                            label="Nombre de la cuenta"
                                            value={account.name}
                                            onChange={(e) => setAccount({ ...account, name: e.target.value })}
                                            error={errors.name}
                                            placeholder="Ej. Caja"
                                            required={true}
                                        />
                                    </div>
                                </div>

                                {/* Descripción */}
                                <div className="row">
                                    <TextareaModal
                                        id="puc_description"
                                        label="Descripción"
                                        value={account.description}
                                        onChange={(e) => setAccount({ ...account, description: e.target.value })}
                                        error={errors.description}
                                        placeholder="Descripción de la cuenta"
                                    />
                                </div>

                                {/* Clase */}
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <InputSelectModal
                                            id="puc_accountClass"
                                            label="Clase de la cuenta"
                                            value={account.accountClass}
                                            onChange={(value) => setAccount({ ...account, accountClass: value })}
                                            error={errors.accountClass}
                                            placeholder="Seleccione la clase"
                                            options={ACCOUNT_CLASSES}
                                            required={true}
                                        />
                                    </div>
                                </div>

                                {/* Nivel jerárquico + Naturaleza */}
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="puc_hierarchyLevel"
                                            label="Nivel jerárquico"
                                            value={account.hierarchyLevel}
                                            onChange={(value) => setAccount({ ...account, hierarchyLevel: value })}
                                            error={errors.hierarchyLevel}
                                            placeholder="Seleccione el nivel"
                                            options={HIERARCHY_LEVELS}
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="puc_nature"
                                            label="Naturaleza de la cuenta"
                                            value={account.nature}
                                            onChange={(value) => setAccount({ ...account, nature: value })}
                                            error={errors.nature}
                                            placeholder="Seleccione la naturaleza"
                                            options={ACCOUNT_NATURES}
                                            required={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ══════════════════════════════════
                                TAB 2 — Cargue masivo Excel
                            ══════════════════════════════════ */}
                            <div className="tab-pane fade" id="tab-bulk" role="tabpanel">

                                {/* Alert error cargue */}
                                <div className={`alert alert-danger alert-dismissible ${uploadError === '' ? 'd-none' : ''}`} role="alert">
                                    <button type="button" className="btn-close" onClick={() => setUploadError('')} aria-label="Close" />
                                    <span>{uploadError}</span>
                                </div>

                                {/* Alert éxito cargue */}
                                <div className={`alert alert-success alert-dismissible ${uploadSuccess === '' ? 'd-none' : ''}`} role="alert">
                                    <button type="button" className="btn-close" onClick={() => setUploadSuccess('')} aria-label="Close" />
                                    <span>{uploadSuccess}</span>
                                </div>

                                <p className="text-muted mb-3">
                                    <i className="ri-information-line me-1"></i>
                                    Cargue un archivo <strong>.xlsx</strong> con las cuentas PUC a importar.
                                    El archivo debe contener las columnas: <em>Código, Nombre, Descripción, Clase, Nivel Jerárquico, Naturaleza</em>.
                                </p>

                                {/* Dropzone */}
                                <div
                                    ref={dropzoneRef}
                                    className="dropzone needsclick"
                                    style={{ minHeight: '150px', border: '2px dashed #a0aec0', borderRadius: '8px' }}
                                >
                                    <div className="dz-message needsclick text-center py-4">
                                        <i className="ri-upload-cloud-2-line fs-1 text-muted d-block mb-2"></i>
                                        <span className="text-muted">Arrastra un archivo <strong>.xlsx</strong> aquí o haz clic para seleccionarlo</span>
                                        <br />
                                        <small className="text-muted">(Máximo 10 MB — Solo archivos .xlsx)</small>
                                    </div>
                                </div>

                                <div className="mt-3 d-flex justify-content-end">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleBulkUpload}
                                        disabled={uploading}
                                    >
                                        {uploading
                                            ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...</>
                                            : <><i className="ri-upload-2-line me-1"></i>Cargar archivo</>
                                        }
                                    </button>
                                </div>
                            </div>

                        </div>{/* /tab-content */}
                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            Guardar
                        </button>
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePUC;
