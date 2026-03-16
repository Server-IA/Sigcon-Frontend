import { useState, useEffect } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";
import InputDate from "../../../components/molecules/InputDate";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

const UpdateAssets = ({
  modalRef,
  modalInstance,
  assets,
  setAssets,
  dataTableRef,
  thirds,
  accountingAccount,
  depreciationRules,
  setModuleEdit,
}) => {
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({ message: "", type: "", show: false });

  // Limpiar errores al cerrar el modal
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const reset = () => {
      setError({ message: "", type: "", show: false });
      setErrors({});
    };
    el.addEventListener("hidden.bs.modal", reset);
    return () => el.removeEventListener("hidden.bs.modal", reset);
  }, [modalRef]);

  const handleSave = async () => {
    try {
      const url = base_url(["api", "v1", "assets", assets.id]);
      await fetchHelper.put(url, assets, {}, 1000);

      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setErrors({});
      setError({ message: "", type: "", show: false });
    } catch (err) {
      console.error("Error al actualizar activo:", err);
      const errores = err?.errors;
      if (errores?.length > 0) {
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
  console.log("ASSETS", assets);
  console.log("ACCOUNTS", accountingAccount);
  console.log("THIRDS", thirds);
  console.log("RULES", depreciationRules);
  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="modalCenter"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div
        className="modal-dialog modal-dialog-centered modal-xl"
        role="document"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Editar Activo</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>

          <div className="modal-body">
            <AlertPage
              message={error.message}
              type={error.type}
              show={error.show}
              onChange={() => setError({ message: "", type: "", show: false })}
            />

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="name_asset_update"
                  label="Nombre"
                  value={assets.name}
                  onChange={(e) => {
                    setAssets({ ...assets, name: e.target.value });
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  error={errors.name}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="description_asset_update"
                  label="Descripción"
                  value={assets.description}
                  onChange={(e) => {
                    setAssets({ ...assets, description: e.target.value });
                    setErrors((prev) => ({ ...prev, description: "" }));
                  }}
                  error={errors.description}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="classification_asset_update"
                  label="Clasificación"
                  value={assets.classification}
                  onChange={(value) => {
                    setAssets({ ...assets, classification: value });
                    setErrors((prev) => ({ ...prev, classification: "" }));
                  }}
                  options={[
                    { id: "NON_CURRENT", label: "Activo no corriente" },
                    { id: "CURRENT", label: "Activo corriente" },
                  ]}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="type_asset_update"
                  label="Tipo"
                  value={assets.type}
                  onChange={(value) => {
                    setAssets({ ...assets, type: value });
                    setErrors((prev) => ({ ...prev, type: "" }));
                  }}
                  options={[
                    { id: "TANGIBLE", label: "Tangible" },
                    { id: "INTANGIBLE", label: "Intangible" },
                  ]}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="accountingAccountId_update"
                  label="Cuenta contable"
                  value={assets.accountingAccountId}
                  onChange={(value) => {
                    setAssets({
                      ...assets,
                      accountingAccountId: value,
                    });
                    setErrors((prev) => ({ ...prev, accountingAccountId: "" }));
                  }}
                  options={accountingAccount}
                  required
                  error={errors.accountingAccountId}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="acquisitionValue_update"
                  label="Valor adquisición"
                  value={assets.acquisitionValue}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      acquisitionValue: Number(e.target.value),
                    });
                    setErrors((prev) => ({ ...prev, acquisitionValue: "" }));
                  }}
                  error={errors.acquisitionValue}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputDate
                  id="acquisitionDate_update"
                  label="Fecha adquisición"
                  date={assets.acquisitionDate}
                  onChange={(date) => {
                    const acquisitionDate = date ? new Date(date) : null;

                    setAssets({
                      ...assets,
                      acquisitionDate: acquisitionDate
                        .toISOString()
                        .split("T")[0],
                    });
                    setErrors((prev) => ({ ...prev, acquisitionDate: "" }));
                  }}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="usefulLifeMonths_update"
                  label="Vida útil (meses)"
                  value={assets.usefulLifeMonths}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      usefulLifeMonths: Number(e.target.value),
                    });
                    setErrors((prev) => ({ ...prev, usefulLifeMonths: "" }));
                  }}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="depreciationRuleId_update"
                  label="Método depreciación"
                  value={assets.depreciationRuleId}
                  onChange={(value) => {
                    setAssets({
                      ...assets,
                      depreciationRuleId: value,
                    });
                    setErrors((prev) => ({ ...prev, depreciationRuleId: "" }));
                  }}
                  options={depreciationRules.filter(
                    (d) => d.accountingAccountId == assets.accountingAccountId,
                  )}
                  required
                  error={errors.depreciationRuleId}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="supplierId_update"
                  label="Proveedor"
                  value={assets.supplierId}
                  onChange={(value) => {
                    setAssets({
                      ...assets,
                      supplierId: Number(value),
                    });
                    setErrors((prev) => ({ ...prev, supplierId: "" }));
                  }}
                  options={thirds}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="paymentTerms_update"
                  label="Condición de pago"
                  value={assets.paymentTerms}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      paymentTerms: e.target.value,
                    });
                  }}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="accountsPayableReferenceId_update"
                  label="Referencia cuentas por pagar"
                  value={assets.accountsPayableReferenceId}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      accountsPayableReferenceId: Number(e.target.value),
                    });
                  }}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="bankCashReferenceId_update"
                  label="Referencia banco/caja"
                  value={assets.bankCashReferenceId}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      bankCashReferenceId: Number(e.target.value),
                    });
                  }}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="costCenterOrAccountingLocation_update"
                  label="Centro de costo / sede"
                  value={assets.costCenterOrAccountingLocation}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      costCenterOrAccountingLocation: e.target.value,
                    });
                  }}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="status_update"
                  label="Estado"
                  value={assets.status}
                  onChange={(value) => {
                    setAssets({ ...assets, status: value });
                  }}
                  options={[
                    { id: "ACTIVE", label: "Activo" },
                    { id: "IN_REPAIR", label: "En reparación" },
                    { id: "DECOMMISSIONED", label: "Dado de baja" },
                    { id: "TRANSFERRED", label: "Transferido" },
                  ]}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="observations_update"
                  label="Observaciones"
                  value={assets.observations}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      observations: e.target.value,
                    });
                  }}
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
              onClick={handleSave}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAssets;
