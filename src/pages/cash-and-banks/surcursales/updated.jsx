import { useState } from "react";

import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { sanitizeSimpleText } from "../../../utils/bankUtils";

const API_BASE = ["api", "v1", "bank-branches"];

const MAIN_BRANCH_OPTIONS = [
  { id: "true", label: "Principal" },
  { id: "false", label: "Secundaria" },
];

const validateBranchForm = ({ branch }) => {
  const nextErrors = {};

  if (!branch.id) nextErrors.id = "ID requerido";
  if (!branch.municipalityId) nextErrors.municipalityId = "Ciudad requerida";
  if (!branch.address) nextErrors.address = "Direccion requerida";

  return {
    isValid: Object.keys(nextErrors).length === 0,
    errors: nextErrors,
  };
};

const UpdatedBankBranch = ({
  modalRef,
  modalInstance,
  branch,
  setBranch,
  setBranchUpdate,
  municipalities,
  datatable,
}) => {
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const handleBackendErrors = (error) => {
    const apiErrors = error?.errors;
    if (apiErrors?.length > 0) {
      const fieldErrors = {};
      apiErrors.forEach((err) => {
        const field = err.field || err.path;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrorMessage(error?.msg || "Error al actualizar la sucursal");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateBranchForm({ branch });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const payload = {
      ...branch,
      address: branch.address?.trim() || "",
      municipalityId: Number(branch.municipalityId),
      mainBranch: Boolean(branch.mainBranch),
      // QA Bloque AU (2026-05-06) — Bug 3: enviar telefono actualizado
      // (string vacio se interpreta en backend como limpiar el campo).
      phone: (branch.phone ?? "").trim(),
    };

    try {
      const url = base_url([...API_BASE, branch.id]);
      await fetchHelper.put(url, payload, {}, 1000, false);
      await datatable?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setBranchUpdate(true);
      setErrors({});
      setErrorMessage("");
    } catch (error) {
      handleBackendErrors(error);
    }
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title fw-bold">Editar sucursal</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <AlertPage
              message={errorMessage}
              type="danger"
              show={errorMessage ? true : false}
              onChange={() => setErrorMessage("")}
            />

            <div className="row">
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="BRANCH_ID_UPDATE"
                  label="Identificador"
                  value={branch.id ?? ""}
                  readOnly
                  error={errors.id}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="MUNICIPALITY_UPDATE"
                  label="Ciudad"
                  value={branch.municipalityId}
                  onChange={(value) => {
                    setBranch({ ...branch, municipalityId: Number(value) });
                    setErrors({ ...errors, municipalityId: "" });
                  }}
                  error={errors.municipalityId}
                  placeholder="Seleccione una ciudad"
                  required
                  options={municipalities.map((m) => ({ id: m.id, label: m.name })) || []}
                />
              </div>
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="ADDRESS_UPDATE"
                  label="Direccion"
                  value={branch.address}
                  onChange={(e) => {
                    setBranch({ ...branch, address: sanitizeSimpleText(e.target.value, 150) });
                    setErrors({ ...errors, address: "" });
                  }}
                  error={errors.address}
                  placeholder="Ej: Carrera 7 # 32-15"
                  required
                />
              </div>
            </div>

            <div className="row">
              {/* QA Bloque AU (2026-05-06) — Bug 3: telefono editable. */}
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="PHONE_UPDATE"
                  label="Telefono de la sucursal"
                  value={branch.phone || ""}
                  onChange={(e) => {
                    const cleaned = (e.target.value || "")
                      .replace(/[^\d+ \-]/g, "")
                      .slice(0, 30);
                    setBranch({ ...branch, phone: cleaned });
                  }}
                  placeholder="Ej: 6017512345"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="MAIN_BRANCH_UPDATE"
                  label="Sucursal principal"
                  value={branch.mainBranch ? "true" : "false"}
                  onChange={(value) =>
                    setBranch({
                      ...branch,
                      mainBranch: value === true || value === "true",
                    })
                  }
                  options={MAIN_BRANCH_OPTIONS}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
              Cerrar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Actualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatedBankBranch;
