import { useEffect, useState } from "react";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import PageAlert from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

/**
 * Modal para asignar una retencion al sistema.
 * Campos: retencion (requerido, dropdown), vigencia desde (requerido, date),
 * vigencia hasta (opcional, date).
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.modalRef - Referencia al elemento DOM del modal
 * @param {Object} props.modalInstance - Instancia de bootstrap.Modal
 * @param {Object} props.assignment - Estado de la asignacion
 * @param {Function} props.setAssignment - Setter del estado
 * @param {Object} props.dataTableRef - Referencia al DataTable
 * @param {Function} props.setAssignmentCreate - Setter para alerta de creacion exitosa
 * @param {Array} props.withholdings - Lista de retenciones disponibles para el dropdown
 */
const CreateAssignment = ({
  modalRef,
  modalInstance,
  assignment,
  setAssignment,
  dataTableRef,
  setAssignmentCreate,
  withholdings,
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

    const url = base_url(["api/v1/resources/system-withholdings/assign"]);
    try {
      await fetchHelper.post(url, assignment, {}, 1000);
      setAssignment({
        id: "",
        withholdingId: "",
        effectiveFrom: "",
        effectiveTo: "",
      });
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setAssignmentCreate(true);
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

  useEffect(() => {
    setError({ message: "", type: "", show: false });
  }, [assignment]);

  /**
   * Mapea las retenciones al formato esperado por InputSelectModal.
   */
  const withholdingOptions = withholdings.map((w) => ({
    id: w.id,
    label: w.name || w.code || `Retencion ${w.id}`,
  }));

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        id="modalCreateAssignment"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Asignar Retencion al Sistema</h4>
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
                  <InputSelectModal
                    id="withholdingId"
                    label="Retencion"
                    value={assignment.withholdingId}
                    onChange={(value) =>
                      setAssignment({ ...assignment, withholdingId: value })
                    }
                    error={errors.withholdingId}
                    placeholder="Seleccione la retencion"
                    options={withholdingOptions}
                    required={true}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputModal
                    type="date"
                    id="effectiveFrom"
                    label="Vigencia desde"
                    value={assignment.effectiveFrom}
                    onChange={(e) => {
                      setAssignment({
                        ...assignment,
                        effectiveFrom: e.target.value,
                      });
                      setErrors((prev) => ({
                        ...prev,
                        effectiveFrom: "",
                      }));
                    }}
                    error={errors.effectiveFrom}
                    placeholder="Vigencia desde"
                    required={true}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col mb-6 mt-2">
                  <InputModal
                    type="date"
                    id="effectiveTo"
                    label="Vigencia hasta"
                    value={assignment.effectiveTo}
                    onChange={(e) => {
                      setAssignment({
                        ...assignment,
                        effectiveTo: e.target.value,
                      });
                      setErrors((prev) => ({
                        ...prev,
                        effectiveTo: "",
                      }));
                    }}
                    error={errors.effectiveTo}
                    placeholder="Vigencia hasta"
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

export default CreateAssignment;
