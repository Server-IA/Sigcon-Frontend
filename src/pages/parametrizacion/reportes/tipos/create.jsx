import { useEffect, useState } from "react";
import { base_url } from "../../../../utils/functions";
import { fetchHelper } from "../../../../utils/fetch";
import PageAlert from "../../../../components/molecules/AlertPage";
import InputModal from "../../../../components/molecules/InputModal";
import InputSelectModal from "../../../../components/molecules/inputSelectModal";

/**
 * Modal para crear un nuevo Tipo de Reporte.
 * Campos: nombre (requerido), descripcion (opcional), estado (ACTIVE/INACTIVE).
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.modalRef - Referencia al elemento DOM del modal
 * @param {Object} props.modalInstance - Instancia de bootstrap.Modal
 * @param {Object} props.reportType - Estado del tipo de reporte
 * @param {Function} props.setReportType - Setter del estado
 * @param {Object} props.dataTableRef - Referencia al DataTable
 * @param {Function} props.setReportTypeCreate - Setter para alerta de creacion exitosa
 */
const CreateReportType = ({
  modalRef,
  modalInstance,
  reportType,
  setReportType,
  dataTableRef,
  setReportTypeCreate,
}) => {
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({
    message: "",
    type: "",
    show: false,
  });

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        setErrors({});
        setError({ message: "", type: "", show: false });
      });
    }
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener("hidden.bs.modal", () => {
          setErrors({});
          setError({ message: "", type: "", show: false });
        });
      }
    };
  }, [modalRef.current]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = base_url(["api", "report-types", "store"]);
    try {
      await fetchHelper.post(url, reportType, {}, 1000);
      setReportType({
        id: "",
        name: "",
        description: "",
        status: "ACTIVE",
      });
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setReportTypeCreate(true);
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
        setError({ message: error.msg, type: "danger", show: true });
      }
    }
  };

  const handleClear = () => {
    setReportType({
      id: "",
      name: "",
      description: "",
      status: "ACTIVE",
    });
    setErrors({});
    setError({ message: "", type: "", show: false });
  };

  useEffect(() => {
    setError({ message: "", type: "", show: false });
  }, [reportType]);

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        id="modalCreateReportType"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Crear Tipo de Reporte</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <PageAlert
                message={error.message}
                type={error.type}
                show={error.show}
                onChange={() =>
                  setError({ message: "", type: "", show: false })
                }
              />

              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputModal
                    type="text"
                    id="name"
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
                    id="description"
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
                    id="status"
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
                Volver
              </button>
              <button
                type="button"
                className="btn btn-outline-warning"
                onClick={handleClear}
              >
                Limpiar
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

export default CreateReportType;
