import { useState, useEffect } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

import { useDispatch } from "react-redux";
import { refreshMenu } from "../../../routes/routes";
import InputDate from "../../../components/molecules/InputDate";

const CreateAssets = ({
  modalRef,
  modalInstance,
  assets,
  setAssets,
  dataTableRef,
  setAssetsCreate,
  thirds,
  accountingAccount,
  depreciationRules,
}) => {
  const dispatch = useDispatch();

  const filteredDepreciationRules = depreciationRules.filter(
    (d) => d.accountingAccountId == assets.accountingAccountId,
  );
  const [errors, setErrors] = useState({});

  const [error, setError] = useState({
    message: "",
    type: "",
    show: false,
  });

  useEffect(() => {
    const handler = () => {
      setError({ message: "", type: "", show: false });
      setErrors({});
    };

    const modal = modalRef.current;

    if (modal) {
      modal.addEventListener("hidden.bs.modal", handler);
    }

    return () => {
      if (modal) {
        modal.removeEventListener("hidden.bs.modal", handler);
      }
    };
  }, []);

  useEffect(() => {
    console.log("Assets: ", assets);
    console.log("Depreciation Rules: ", depreciationRules);
  }, [assets]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = base_url(["api", "v1", "assets", "store"]);

      await fetchHelper.post(url, assets, {}, 1000);

      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();

      setAssetsCreate(true);

      setErrors({});
      setError({ message: "", type: "", show: false });
    } catch (error) {
      console.error(error);

      const errores = error?.errors;

      if (errores && errores.length > 0) {
        const fieldErrors = {};

        errores.forEach((err) => {
          fieldErrors[err.field] = err.message;
        });

        setErrors(fieldErrors);
      } else if (error?.msg) {
        setError({
          message: error.msg,
          type: "danger",
          show: true,
        });
      }
    }
  };
  console.log("Thirds:", thirds);
  console.log("PUC:", accountingAccount);
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
            <h4 className="modal-title">Datos y vinculaciones</h4>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
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
                  id="name"
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
                  id="description"
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
                  id="classification"
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
                  id="type"
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
                  id="accountingAccountId"
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
                  id="acquisitionValue"
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
                  id="acquisitionDate"
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
                  id="usefulLifeMonths"
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
                  id="depreciationRuleId"
                  label="Método depreciación"
                  value={assets.depreciationRuleId}
                  onChange={(value) => {
                    setAssets({
                      ...assets,
                      depreciationRuleId: value,
                    });
                    setErrors((prev) => ({ ...prev, depreciationRuleId: "" }));
                  }}
                  options={filteredDepreciationRules}
                  required
                  error={errors.depreciationRuleId}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="supplierId"
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
                  id="paymentTerms"
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
                  id="accountsPayableReferenceId"
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
                  id="bankCashReferenceId"
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
                  id="costCenterOrAccountingLocation"
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
                  id="status"
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
                  id="observations"
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
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              Cerrar
            </button>

            <button className="btn btn-primary" onClick={handleSubmit}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssets;
