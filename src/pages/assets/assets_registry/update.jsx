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
}) => {
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({
    message: "",
    type: "",
    show: false,
  });

  // limpiar errores al cerrar modal
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

  // actualizar reglas de depreciación cuando cambia cuenta contable
  useEffect(() => {
    if (!assets.accountingAccountId) return;

    const rules = depreciationRules.filter(
      (d) =>
        Number(d.accountingAccountId) === Number(assets.accountingAccountId),
    );

    if (!rules.find((r) => r.id === assets.depreciationRuleId)) {
      setAssets((prev) => ({
        ...prev,
        depreciationRuleId: "",
      }));
    }
  }, [assets.accountingAccountId, depreciationRules]);

  const handleSave = async () => {
    try {
      const updateUrl = base_url(["api", "v1", "assets", assets.id]);

      const body = {
        name: assets.name,
        description: assets.description,
        classification: assets.classification,
        type: assets.type,
        accountingAccountId: assets.accountingAccountId,
        acquisitionValue: assets.acquisitionValue,
        acquisitionDate: assets.acquisitionDate,
        usefulLifeMonths: assets.usefulLifeMonths,
        depreciationRuleId: assets.depreciationRuleId,
        supplierId: assets.supplierId,
        paymentTerms: assets.paymentTerms,
        accountsPayableReferenceId: assets.accountsPayableReferenceId,
        bankCashReferenceId: assets.bankCashReferenceId,
        // costCenterOrAccountingLocation: assets.costCenterOrAccountingLocation,
        status: assets.status,
        observations: assets.observations,
      };

      await fetchHelper.put(updateUrl, body, {}, 1000);

      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();

      setErrors({});
      setError({ message: "", type: "", show: false });
    } catch (err) {
      console.error("Error al actualizar activo:", err);

      if (err?.errors?.length) {
        const fieldErrors = {};

        err.errors.forEach((e) => {
          fieldErrors[e.field] = e.message;
        });

        setErrors(fieldErrors);
      } else if (err?.msg) {
        setError({
          message: err.msg,
          type: "danger",
          show: true,
        });
      }
    }
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="modalCenter"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Editar Activo</h4>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">
            <AlertPage
              message={error.message}
              type={error.type}
              show={error.show}
              onChange={() => setError({ message: "", type: "", show: false })}
            />

            {/* FILA 1 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="name_asset_update"
                  label="Nombre"
                  value={assets.name}
                  onChange={(e) =>
                    setAssets({ ...assets, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setAssets({ ...assets, description: e.target.value })
                  }
                  error={errors.description}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="classification_asset_update"
                  label="Clasificación"
                  value={assets.classification}
                  onChange={(value) =>
                    setAssets({ ...assets, classification: value })
                  }
                  options={[
                    { id: "NON_CURRENT", label: "Activo no corriente" },
                    { id: "CURRENT", label: "Activo corriente" },
                  ]}
                  required
                />
              </div>
            </div>

            {/* FILA 2 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="type_asset_update"
                  label="Tipo"
                  value={assets.type}
                  onChange={(value) => setAssets({ ...assets, type: value })}
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
                  onChange={(value) =>
                    setAssets({
                      ...assets,
                      accountingAccountId: Number(value),
                    })
                  }
                  options={accountingAccount}
                  error={errors.accountingAccountId}
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="acquisitionValue_update"
                  label="Valor adquisición"
                  value={assets.acquisitionValue}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      acquisitionValue: Number(e.target.value),
                    })
                  }
                  error={errors.acquisitionValue}
                  required
                />
              </div>
            </div>

            {/* FILA 3 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputDate
                  id="acquisitionDate_update"
                  label="Fecha adquisición"
                  date={assets.acquisitionDate}
                  onChange={(date) => {
                    const acquisitionDate = date
                      ? new Date(date).toISOString().split("T")[0]
                      : null;

                    setAssets({
                      ...assets,
                      acquisitionDate,
                    });
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
                    // QA Activos (2026-05-25) Error 01: limitar a 1 - 1200 meses.
                    const n = Number(e.target.value);
                    setAssets({
                      ...assets,
                      usefulLifeMonths: e.target.value === '' ? '' : (n > 1200 ? 1200 : n),
                    });
                  }}
                  min="1"
                  max="1200"
                  step="1"
                  required
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="depreciationRuleId_update"
                  label="Método depreciación"
                  value={assets.depreciationRuleId}
                  onChange={(value) =>
                    setAssets({
                      ...assets,
                      depreciationRuleId: Number(value),
                    })
                  }
                  options={
                    depreciationRules?.filter(
                      (d) =>
                        Number(d.accountingAccountId) ===
                        Number(assets.accountingAccountId),
                    ) || []
                  }
                  error={errors.depreciationRuleId}
                  required
                />
              </div>
            </div>

            {/* FILA 4 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="supplierId_update"
                  label="Proveedor"
                  value={assets.supplierId}
                  onChange={(value) =>
                    setAssets({
                      ...assets,
                      supplierId: Number(value),
                    })
                  }
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
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      paymentTerms: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="accountsPayableReferenceId_update"
                  label="Referencia cuentas por pagar"
                  value={assets.accountsPayableReferenceId}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      accountsPayableReferenceId: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* FILA 5 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="bankCashReferenceId_update"
                  label="Referencia banco/caja"
                  value={assets.bankCashReferenceId}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      bankCashReferenceId: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="costCenterOrAccountingLocation_update"
                  label="Centro de costo / sede"
                  value={assets.costCenterOrAccountingLocation}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      costCenterOrAccountingLocation: e.target.value,
                    })
                  }
                />
              </div> */}

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="status_update"
                  label="Estado"
                  value={assets.status}
                  onChange={(value) =>
                    setAssets({
                      ...assets,
                      status: value,
                    })
                  }
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

            {/* FILA 6 */}

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="observations_update"
                  label="Observaciones"
                  value={assets.observations}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      observations: e.target.value,
                    })
                  }
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

            <button className="btn btn-primary" onClick={handleSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAssets;
