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

            {/* FILA 1 */}
            <div className="row">
              <div className="col-md-4 mb-4">
                <InputModal
                  type="text"
                  id="name"
                  placeholder="Ej: Computador portátil Dell XPS 13"
                  label="Nombre"
                  value={assets.name}
                  onChange={(e) =>
                    setAssets({ ...assets, name: e.target.value })
                  }
                  error={errors.name}
                  required
                />
              </div>

              <div className="col-md-4 mb-4">
                <InputModal
                  type="text"
                  id="description"
                  placeholder="Ej: Computador portátil Dell XPS 13"
                  label="Descripción"
                  value={assets.description}
                  onChange={(e) =>
                    setAssets({ ...assets, description: e.target.value })
                  }
                  error={errors.description}
                />
              </div>

              <div className="col-md-4 mb-4">
                <InputSelectModal
                  id="classification"
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
              <div className="col-md-4 mb-4">
                <InputSelectModal
                  id="type"
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

              <div className="col-md-4 mb-4">
                <InputSelectModal
                  id="accountingAccountId"
                  label="Cuenta contable"
                  value={assets.accountingAccountId}
                  onChange={(value) =>
                    setAssets({ ...assets, accountingAccountId: value })
                  }
                  options={accountingAccount}
                  required
                  error={errors.accountingAccountId}
                />
              </div>

              <div className="col-md-4 mb-4">
                <InputModal
                  type="number"
                  id="acquisitionValue"
                  label="Valor adquisición"
                  placeholder="Ej: 1500000"
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
              <div className="col-md-4 mb-4">
                <InputDate
                  id="acquisitionDate"
                  label="Fecha adquisición"
                  placeholder="AAAA-MM-DD"
                  date={assets.acquisitionDate}
                  onChange={(date) =>
                    setAssets({
                      ...assets,
                      acquisitionDate: new Date(date)
                        .toISOString()
                        .split("T")[0],
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-4 mb-4">
                <InputModal
                  type="number"
                  id="usefulLifeMonths"
                  label="Vida útil (meses)"
                  placeholder="Ej: 60"
                  value={assets.usefulLifeMonths}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      usefulLifeMonths: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-4 mb-4">
                <InputSelectModal
                  id="depreciationRuleId"
                  label="Método depreciación"
                  value={assets.depreciationRuleId}
                  onChange={(value) =>
                    setAssets({ ...assets, depreciationRuleId: value })
                  }
                  options={filteredDepreciationRules}
                  required
                  error={errors.depreciationRuleId}
                />
              </div>
            </div>

            {/* FILA 4 */}
            <div className="row">
              <div className="col-md-6 mb-4">
                <InputSelectModal
                  id="supplierId"
                  label="Proveedor"
                  value={assets.supplierId}
                  onChange={(value) =>
                    setAssets({ ...assets, supplierId: Number(value) })
                  }
                  options={thirds}
                  required
                />
              </div>

              <div className="col-md-3 mb-4">
                <InputModal
                  type="text"
                  id="paymentTerms"
                  label="Condición de pago"
                  placeholder="Ej: Net 30" //POR DEFINIR CONDICIONES DE PAGO
                  value={assets.paymentTerms}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      paymentTerms: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-3 mb-4">
                <InputModal
                  type="number"
                  id="accountsPayableReferenceId"
                  label="Ref. cuentas por pagar"
                  placeholder="Ej: 12345" //POR DEFINIR DE CUENTAS POR PAGAR
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
              <div className="col-md-6 mb-4">
                <InputModal
                  type="number"
                  id="bankCashReferenceId"
                  label="Referencia banco/caja"
                  placeholder="Ej: 12345" //POR DEFINIR REFERENCIA BANCO/CAJA
                  value={assets.bankCashReferenceId}
                  onChange={(e) =>
                    setAssets({
                      ...assets,
                      bankCashReferenceId: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="col-md-6 mb-4">
                <InputSelectModal
                  id="status"
                  label="Estado"
                  value={assets.status}
                  onChange={(value) => setAssets({ ...assets, status: value })}
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
              <div className="col-md-12 mb-4">
                <InputModal
                  type="text"
                  id="observations"
                  label="Observaciones"
                  placeholder="Ej: El activo se encuentra en buen estado" //POR DEFINIR OBSERVACIONES
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
