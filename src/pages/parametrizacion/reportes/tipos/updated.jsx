import { useEffect, useState } from "react";
import { base_url } from "../../../../utils/functions";
import { fetchHelper } from "../../../../utils/fetch";
import InputModal from "../../../../components/molecules/InputModal";
import InputSelectModal from "../../../../components/molecules/inputSelectModal";

/**
 * Modal para editar un Tipo de Reporte existente.
 * Campos: nombre (requerido), descripcion (opcional), estado (ACTIVE/INACTIVE).
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.modalRef - Referencia al elemento DOM del modal
 * @param {Object} props.modalInstance - Instancia de bootstrap.Modal
 * @param {Object} props.reportType - Estado del tipo de reporte
 * @param {Function} props.setReportType - Setter del estado
 * @param {Object} props.dataTableRef - Referencia al DataTable
 * @param {Function} props.setReportTypeEdit - Setter para alerta de edicion exitosa
 */
const UpdatedReportType = ({
  modalRef,
  modalInstance,
  reportType,
  setReportType,
  dataTableRef,
  setReportTypeEdit,
}) => {
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        setErrors({});
        setErrorMessage("");
      });
    }
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener("hidden.bs.modal", () => {
          setErrors({});
          setErrorMessage("");
        });
      }
    };
  }, [modalRef.current]);

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      const url = base_url(["api", "report-types", "update", reportType.id]);
      await fetchHelper.put(url, reportType, {}, 500, false);

      setReportType({
        id: "",
        name: "",
        description: "",
        status: "",
      });
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setReportTypeEdit(true);
      setErrors({});
    } catch (error) {
      console.log(error.msg);
      const errores = error?.errors;
      if (errores && errores.length > 0) {
        const fieldErrors = {};
        errores.forEach((err) => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error?.msg) {
        setErrorMessage(error.msg);
      }
    }
  };

  useEffect(() => {
    setErrorMessage("");
  }, [reportType]);

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Editar Tipo de Reporte</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div
                className={`alert alert-danger alert-dismissible ${errorMessage === "" ? "d-none" : ""}`}
                role="alert"
              >
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="alert"
                  aria-label="Close"
                ></button>
                <span>{errorMessage}</span>
              </div>

              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputModal
                    type="text"
                    id="name_updated"
                    label="Nombre del tipo de reporte"
                    value={reportType.name}
                    onChange={(e) => {
                      setReportType({ ...reportType, name: e.target.value });
                      setErrors((prev) => ({
                        ...prev,
                        name: "",
                      }));
                    }}
                    error={errors.name}
                    placeholder="Nombre del tipo de reporte"
                    required={true}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputModal
                    type="text"
                    id="description_updated"
                    label="Descripcion"
                    value={reportType.description}
                    onChange={(e) => {
                      setReportType({
                        ...reportType,
                        description: e.target.value,
                      });
                      setErrors((prev) => ({
                        ...prev,
                        description: "",
                      }));
                    }}
                    error={errors.description}
                    placeholder="Descripcion"
                  />
                </div>
              </div>
              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputSelectModal
                    id="status_updated"
                    label="Estado"
                    value={reportType.status}
                    onChange={(value) =>
                      setReportType({ ...reportType, status: value })
                    }
                    error={errors.status}
                    placeholder="Seleccione el estado"
                    options={[
                      { label: "Activo", id: "ACTIVE" },
                      { label: "Inactivo", id: "INACTIVE" },
                    ]}
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
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdatedReportType;
