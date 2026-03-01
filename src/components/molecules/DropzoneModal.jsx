import { useEffect, useRef, useState } from 'react';

const DropzoneModal = ({
    modalRef,
    title = 'Cargue Masivo',
    uploadUrl,
    acceptedFiles = '.xlsx,.xls,.csv',
    maxFiles = 1,
    maxFilesize = 5,
    onSuccess,
    onError,
}) => {

    const formRef = useRef(null);
    const dzInstance = useRef(null);
    const [alert, setAlert] = useState({ text: '', type: '' });

    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        const initDropzone = () => {
            if (dzInstance.current) return;
            const form = formRef.current;
            if (!form) return;

            // Destruir instancia auto-descubierta si existe
            if (form.dropzone) form.dropzone.destroy();

            const token = localStorage.getItem('token');

            dzInstance.current = new window.Dropzone(form, {
                url: uploadUrl,
                maxFiles,
                maxFilesize,
                acceptedFiles,
                addRemoveLinks: true,
                parallelUploads: 1,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                dictDefaultMessage: `
                    <i class="ri-upload-cloud-2-line" style="font-size:2.8rem;display:block;margin-bottom:0.4rem"></i>
                    Arrastra el archivo aquí o <strong>haz clic para seleccionar</strong>
                    <span style="display:block;font-size:0.82rem;color:#8592a3;margin-top:0.4rem">
                        Formatos: Excel (.xlsx, .xls) o CSV &bull; Máx. ${maxFilesize} MB
                    </span>
                `,
                dictRemoveFile: 'Eliminar',
                dictCancelUpload: 'Cancelar',
                dictInvalidFileType: 'Tipo de archivo no permitido.',
                dictFileTooBig: `El archivo supera el límite de ${maxFilesize} MB.`,
                dictMaxFilesExceeded: 'Solo se puede cargar un archivo a la vez.',
                dictResponseError: 'El servidor respondió con un error.',

                success: (file, response) => {
                    let parsed = response;
                    if (typeof response === 'string') {
                        try { parsed = JSON.parse(response); } catch (_) { /* noop */ }
                    }
                    setAlert({ text: parsed?.msg || 'Archivo procesado exitosamente.', type: 'success' });
                    onSuccess?.(parsed);
                },

                error: (file, errorMessage) => {

                    let parsed = errorMessage;
                    if (typeof errorMessage === 'string') {
                        try { parsed = JSON.parse(errorMessage); } catch (_) { /* noop */ }
                    }
                    const text = parsed?.msg
                        ?? (typeof parsed === 'string' ? parsed : 'Error al procesar el archivo.');
                    setAlert({ text, type: 'danger' });
                    onError?.(parsed);
                },
            });
        };

        const destroyDropzone = () => {
            if (dzInstance.current) {
                dzInstance.current.destroy();
                dzInstance.current = null;
            }
            setAlert({ text: '', type: '' });
        };

        el.addEventListener('shown.bs.modal', initDropzone);
        el.addEventListener('hidden.bs.modal', destroyDropzone);

        return () => {
            el.removeEventListener('shown.bs.modal', initDropzone);
            el.removeEventListener('hidden.bs.modal', destroyDropzone);
            destroyDropzone();
        };
    }, [uploadUrl]);

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
                            <div className={`alert alert-${alert.type} mb-3`} role="alert">
                                {alert.text}
                            </div>
                        )}

                        <form ref={formRef} className="dropzone needsclick" action={uploadUrl}>
                            <div className="fallback">
                                <input name="file" type="file" accept={acceptedFiles} />
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal"
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
