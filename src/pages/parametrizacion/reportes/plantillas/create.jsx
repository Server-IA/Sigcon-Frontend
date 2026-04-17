import { useEffect, useState } from "react";
import { base_url } from "../../../../utils/functions";
import { fetchHelper } from "../../../../utils/fetch";
import PageAlert from "../../../../components/molecules/AlertPage";
import InputModal from "../../../../components/molecules/InputModal";
import InputSelectModal from "../../../../components/molecules/inputSelectModal";

/**
 * Modal para crear una nueva Plantilla de Reporte (HU-PA-RF-39).
 *
 * Campos:
 *  - Tipo de reporte (requerido)
 *  - Vigencia desde (requerido, HU-PA-RF-39 E1)
 *  - Vigencia hasta (opcional; NULL = indefinido)
 *  - Archivo adjunto (opcional, PDF/Word/Excel/CSV/TXT/XML, max 10MB)
 *  - Plantilla por defecto (HU-PA-RF-39 E3)
 *  - Descripcion (opcional)
 *
 * Valida E2 (duplicado de vigencia) en backend, muestra el mensaje exacto.
 */
const CreateTemplate = ({
  modalRef,
  modalInstance,
  template,
  setTemplate,
  dataTableRef,
  setTemplateCreate,
  reportTypes,
}) => {
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({ message: "", type: "", show: false });
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!modalRef.current) return;
    const handler = () => {
      setErrors({});
      setError({ message: "", type: "", show: false });
      setFile(null);
    };
    modalRef.current.addEventListener("hidden.bs.modal", handler);
    return () => modalRef.current?.removeEventListener("hidden.bs.modal", handler);
  }, [modalRef]);

  useEffect(() => {
    setError({ message: "", type: "", show: false });
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!template.reportTypeId) {
      setErrors({ reportTypeId: "El tipo de reporte es obligatorio" });
      return;
    }
    if (!template.validFrom) {
      setErrors({ validFrom: "La fecha de vigencia inicial es obligatoria" });
      return;
    }
    if (template.validTo && template.validTo < template.validFrom) {
      setErrors({ validTo: "La vigencia final no puede ser anterior a la inicial" });
      return;
    }

    const formData = new FormData();
    formData.append("reportTypeId", template.reportTypeId);
    formData.append("validFrom", template.validFrom);
    if (template.validTo) formData.append("validTo", template.validTo);
    if (template.description) formData.append("description", template.description);
    formData.append("isDefault", template.isDefault ? "true" : "false");
    if (file) formData.append("file", file);

    const url = base_url(["api", "report-templates", "store"]);
    try {
      await fetchHelper.postForm(url, formData, {}, 1000);
      setTemplate({
        id: "",
        reportTypeId: "",
        description: "",
        validFrom: "",
        validTo: "",
        isDefault: false,
      });
      setFile(null);
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setTemplateCreate(true);
      setErrors({});
    } catch (err) {
      const errores = err?.errors;
      if (errores && errores.length > 0) {
        const fieldErrors = {};
        errores.forEach((e) => {
          fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      } else if (err?.msg) {
        setError({ message: err.msg, type: "danger", show: true });
      }
    }
  };

  const reportTypeOptions = reportTypes.map((rt) => ({
    id: rt.id,
    label: rt.name,
  }));

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="modalCreateTemplate"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Crear Plantilla de Reporte</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <PageAlert
              message={error.message}
              type={error.type}
              show={error.show}
              onChange={() => setError({ message: "", type: "", show: false })}
            />

            <div className="row">
              <div className="col-md-6 mb-3 mt-2">
                <InputSelectModal
                  id="reportTypeId"
                  label="Tipo de Reporte"
                  value={template.reportTypeId}
                  onChange={(value) => setTemplate({ ...template, reportTypeId: value })}
                  error={errors.reportTypeId}
                  placeholder="Seleccione el tipo de reporte"
                  options={reportTypeOptions}
                  required
                />
              </div>
              <div className="col-md-6 mb-3 mt-2 d-flex align-items-center">
                <div className="form-check form-switch mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isDefault"
                    checked={!!template.isDefault}
                    onChange={(e) =>
                      setTemplate({ ...template, isDefault: e.target.checked })
                    }
                  />
                  <label className="form-check-label" htmlFor="isDefault">
                    Marcar como plantilla por defecto del tipo
                  </label>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <InputModal
                  type="date"
                  id="validFrom"
                  label="Vigencia desde"
                  value={template.validFrom || ""}
                  onChange={(e) => {
                    setTemplate({ ...template, validFrom: e.target.value });
                    setErrors((p) => ({ ...p, validFrom: "" }));
                  }}
                  error={errors.validFrom}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <InputModal
                  type="date"
                  id="validTo"
                  label="Vigencia hasta (opcional)"
                  value={template.validTo || ""}
                  onChange={(e) => {
                    setTemplate({ ...template, validTo: e.target.value });
                    setErrors((p) => ({ ...p, validTo: "" }));
                  }}
                  error={errors.validTo}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-3">
                <label htmlFor="file" className="form-label">
                  Archivo de plantilla (PDF, Word, Excel, CSV, TXT, XML — max 10MB)
                </label>
                <input
                  type="file"
                  id="file"
                  className={`form-control ${errors.file ? "is-invalid" : ""}`}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.xml"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {errors.file && <div className="invalid-feedback">{errors.file}</div>}
                {file && (
                  <small className="text-muted">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </small>
                )}
              </div>
            </div>

            <div className="row">
              <div className="col mb-3">
                <InputModal
                  type="text"
                  id="description"
                  label="Descripcion de la plantilla"
                  value={template.description || ""}
                  onChange={(e) => {
                    setTemplate({ ...template, description: e.target.value });
                    setErrors((p) => ({ ...p, description: "" }));
                  }}
                  error={errors.description}
                  placeholder="Descripcion de la plantilla"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              Volver
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplate;
