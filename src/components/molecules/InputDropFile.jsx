import { useEffect, useRef } from "react";
import { base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

const InputDropFile = ({
    label,
    value, // { name, url, size }
    onChange,
    placeholder,
    id,
    acceptedFiles = [],
    uploadUrl // opcional (endpoint backend)
}) => {

    const formRef = useRef(null);
    const dzRef = useRef(null);
    const isInitializing = useRef(false);

    const previewTemplate = `<div class="dz-preview dz-file-preview">
        <div class="dz-details">
            <div class="dz-thumbnail">
                <img data-dz-thumbnail>
                <span class="dz-nopreview">No preview</span>
                <div class="dz-success-mark"></div>
                <div class="dz-error-mark"></div>
                <div class="dz-error-message"><span data-dz-errormessage></span></div>
                <div class="progress">
                    <div class="progress-bar progress-bar-primary" role="progressbar" aria-valuemin="0" aria-valuemax="100" data-dz-uploadprogress></div>
                </div>
            </div>
            <div class="dz-filename" data-dz-name></div>
            <div class="dz-size" data-dz-size></div>
        </div>
    </div>`;

    const toBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    };

    useEffect(() => {
        if (!formRef.current || !window.Dropzone) return;

        const dz = new window.Dropzone(formRef.current, {
            url: uploadUrl || "/upload",
            maxFiles: 1,
            addRemoveLinks: true,
            autoProcessQueue: !!uploadUrl,
            acceptedFiles: acceptedFiles.join(","),
            previewTemplate: previewTemplate,
        });

        dzRef.current = dz;

        // 🟢 Crear archivo
        dz.on("addedfile", async (file) => {

            if (file.isMock || !(file instanceof Blob)) return;

            if (dz.files.length > 1) {
                dz.removeFile(dz.files[0]);
            }

            if (!uploadUrl) {
                const base64 = await toBase64(file);

                onChange({
                    name: file.name,
                    base64
                });
            }
        });

        // 🔵 Backend
        if (uploadUrl) {
            dz.on("success", (file, response) => {
                onChange({
                    name: file.name,
                    response
                });
            });
        }

        // ❌ eliminar
        dz.on("removedfile", () => {
            if (isInitializing.current) return;

            onChange({
                name: null,
                base64: null
            });
        });

        dz.on("error", () => {
            if (isInitializing.current) return;

            onChange({
                name: null,
                base64: null
            });
        });

        return () => dz.destroy();
    }, []);

    // ✅ MODO EDICIÓN (archivo ya existente)
    useEffect(() => {
        const dz = dzRef.current;
        if (!dz) return;

        isInitializing.current = true;

        dz.removeAllFiles(true);

        if (!value || (!value.name && !value.base64)) {
            isInitializing.current = false;
            return;
        }

        const loadFile = async () => {
            const mockFile = {
                name: value.name || "Archivo",
                size: value.size || 12345,
                isMock: true
            };

            dz.emit("addedfile", mockFile);

            // 🔵 Caso: base64 (archivo recién subido)
            if (value.base64) {
                dz.emit("thumbnail", mockFile, value.base64);
            }

            // 🟡 Caso: archivo backend
            else if (value.name) {
                const fileUrl = base_url(['api/v1/companies/logo', value.name]);

                dz.emit("thumbnail", mockFile, fileUrl);
            }

            dz.emit("complete", mockFile);
            dz.files.push(mockFile);

            isInitializing.current = false;
        };

        loadFile();

    }, [value]);

    return (
        <form ref={formRef} className="dropzone" id={id}>
            <div className="dz-message">
                {label}
                <span className="note">{placeholder}</span>
            </div>
        </form>
    );
};

export default InputDropFile;