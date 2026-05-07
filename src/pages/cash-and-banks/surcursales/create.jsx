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

  if (!branch.municipalityId) nextErrors.municipalityId = "Ciudad requerida";
  if (!branch.address) nextErrors.address = "Direccion requerida";
  return { isValid: Object.keys(nextErrors).length === 0, errors: nextErrors };
};

const CreateBankBranch = ({
  modalRef,
  modalInstance,
  branch,
  setBranch,
  setBranchCreate,
  municipalities,
  datatable,
  // QA Bloque AU (2026-05-06) — Bug 1: prop nueva. El index calcula si el banco
  // ya tiene una sucursal principal y la pasa aqui. Cuando es la primera
  // (forceMainBranch=true) bloqueamos el dropdown en "Principal" para que
  // ningun usuario pueda crear una primera sucursal Secundaria.
  forceMainBranch = false,
}) => {
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  // QA Bloque AU — Bug 1: si el banco aun no tiene principal, sincronizamos
  // mainBranch=true en el state inmediatamente al abrir el modal.
  useEffect(() => {
    if (forceMainBranch && branch?.mainBranch !== true) {
      setBranch((prev) => ({ ...prev, mainBranch: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceMainBranch]);


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
      ...branch,
      mainBranch: Boolean(branch.mainBranch),
      municipalityId: Number(branch.municipalityId),
      address: branch.address?.trim() || "",
      // QA Bloque AU (2026-05-06) — Bug 3: telefono opcional de la sucursal.
      phone: (branch.phone || "").trim() || null,
    };

    try {
      const url = base_url(API_STORE);
      await fetchHelper.post(url, payload, {}, 1000, false);
      setBranch({
        id: null,
        bankId: Number(branch.bankId),
        address: null,
        municipalityId: null,
        mainBranch: false,
        status: "active",
      });
      datatable?.current?.ajax.reload();
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
                  id="MUNICIPALITY_CREATE"
                  label="Ciudad"
                  value={branch.municipalityId}
                  onChange={(value) => {
                    setBranch({ ...branch, municipalityId: value });
                    setErrors({ ...errors, municipalityId: "" });
                  }}
                  error={errors.municipalityId}
                  placeholder="Seleccione una ciudad"
                  options={municipalities.map(municipality => ({ id: municipality.id, label: municipality.name }))}
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
              {/* QA Bloque AU (2026-05-06) — Bug 3: telefono de la sucursal. */}
              <div className="col-12 mb-3">
                <InputModal
                  type="text"
                  id="PHONE_CREATE"
                  label="Telefono de la sucursal"
                  value={branch.phone || ""}
                  onChange={(e) => {
                    // Solo digitos, +, espacios y guiones (formato de telefono).
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
                  id="MAIN_BRANCH_CREATE"
                  label="Sucursal principal"
                  value={(forceMainBranch || branch.mainBranch) ? "true" : "false"}
                  onChange={(value) =>
                    setBranch({
                      ...branch,
                      mainBranch: value === true || value === "true",
                    })
                  }
                  options={
                    forceMainBranch
                      ? [{ id: "true", label: "Principal" }]
                      : MAIN_BRANCH_OPTIONS
                  }
                  disabled={forceMainBranch}
                />
                {forceMainBranch && (
                  <div className="form-text text-info">
                    <i className="ri-information-line me-1"></i>
                    La primera sucursal de un banco debe ser Principal y no se
                    puede registrar como Secundaria.
                  </div>
                )}
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
