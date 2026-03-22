import { useEffect, useState } from "react";

import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { sanitizeSimpleText } from "../../../utils/bankUtils";

const API_STORE = ["api", "v1", "bank-branches", "store"];

const MAIN_BRANCH_OPTIONS = [
  { id: "true", label: "Principal" },
  { id: "false", label: "Secundaria" },
];

const validateBranchForm = ({ branch }) => {
  const nextErrors = {};

  if (!branch.bankId) nextErrors.bankId = "Banco requerido";
  if (!branch.city) nextErrors.city = "Ciudad requerida";
  if (!branch.address) nextErrors.address = "Direccion requerida";

  return {
    isValid: Object.keys(nextErrors).length === 0,
    errors: nextErrors,
  };
};

const CreateBankBranch = ({
  modalRef,
  modalInstance,
  branch,
  setBranch,
  onRefresh,
  setBranchCreate,
  banks,
  selectedBankId = "",
}) => {
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (selectedBankId && !branch.bankId) {
      setBranch({ ...branch, bankId: String(selectedBankId) });
    }
  }, [selectedBankId, branch, setBranch]);

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

    setErrorMessage(error?.msg || "Error al registrar la sucursal");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateBranchForm({ branch });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const payload = {
      address: branch.address?.trim() || "",
      city: branch.city?.trim() || "",
      mainBranch: Boolean(branch.mainBranch),
      bankId: Number(branch.bankId),
    };

    try {
      const url = base_url(API_STORE);
      await fetchHelper.post(url, payload, {}, 1000, true);
      setBranch({
        id: null,
        bankId: "",
        bankName: "",
        bankCode: "",
        address: "",
        city: "",
        mainBranch: false,
        status: "",
      });
      await onRefresh?.();
      modalInstance?.current?.hide();
      setBranchCreate(true);
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
            <h4 className="modal-title fw-bold">Crear sucursal</h4>
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
                <InputSelectModal
                  id="BANK_ID_CREATE"
                  label="Banco"
                  value={branch.bankId}
                  onChange={(value) => {
                    setBranch({ ...branch, bankId: value });
                    setErrors({ ...errors, bankId: "" });
                  }}
                  error={errors.bankId}
                  placeholder="Seleccione un banco"
                  options={banks}
                  required
                  disabled={Boolean(selectedBankId)}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="CITY_CREATE"
                  label="Ciudad"
                  value={branch.city}
                  onChange={(e) => {
                    setBranch({ ...branch, city: sanitizeSimpleText(e.target.value, 100) });
                    setErrors({ ...errors, city: "" });
                  }}
                  error={errors.city}
                  placeholder="Ej: Bogota"
                  required
                />
              </div>
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="ADDRESS_CREATE"
                  label="Direccion"
                  value={branch.address}
                  onChange={(e) => {
                    setBranch({ ...branch, address: sanitizeSimpleText(e.target.value, 150) });
                    setErrors({ ...errors, address: "" });
                  }}
                  error={errors.address}
                  placeholder="Ej: Calle 50 # 10-20"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="MAIN_BRANCH_CREATE"
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
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBankBranch;
