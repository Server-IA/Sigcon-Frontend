import { useState, useEffect } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

const UpdateAssets = ({
  modalRef,
  modalInstance,
  assets = {
    id: "",
    code: "",
    name: "",
    description: "",
    classification: "",
    acquisition_date: "",
    acquisition_cost: "",
    useful_life_months: "",
    accumulated_depreciation: "",
    book_value: "",
    revaluation_value: "",
    is_depreciable: true,
    depreciation_rule_id: null,
    companies_id: null,
    accounting_accounts_id: null,
    company_locations_id: null,
    third_parties_id: null,
    states_assets_id: null,
  },
  setAssets,
  dataTableRef,
  modules,
  parents,
  components,
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
      const url = base_url(["api", "assets", assets.id]);
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

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="modalUpdateAsset"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
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
                  id="labelUpdate"
                  label="Nombre del activo"
                  value={assets.label}
                  onChange={(e) => {
                    setAssets({ ...assets, label: e.target.value });
                    setErrors((prev) => ({ ...prev, label: "" }));
                  }}
                  error={errors.label}
                  placeholder="Nombre del activo"
                  required={true}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="pathUpdate"
                  label="Ruta del activo"
                  value={assets.path}
                  onChange={(e) => {
                    setAssets({ ...assets, path: e.target.value });
                    setErrors((prev) => ({ ...prev, path: "" }));
                  }}
                  error={errors.path}
                  placeholder="Ruta del activo"
                  required={true}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="iconUpdate"
                  label="Icono del activo"
                  value={assets.icon}
                  onChange={(e) => {
                    setAssets({ ...assets, icon: e.target.value });
                    setErrors((prev) => ({ ...prev, icon: "" }));
                  }}
                  error={errors.icon}
                  placeholder="Icono del activo"
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="menuOrderUpdate"
                  label="Orden del menu"
                  value={assets.menuOrder}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      menuOrder: e.target.value ? parseInt(e.target.value) : 1,
                    });
                    setErrors((prev) => ({ ...prev, menuOrder: "" }));
                  }}
                  error={errors.menuOrder}
                  placeholder="Orden del menu"
                  required={true}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="componentUpdate"
                  label="Componente del menu"
                  value={assets.component}
                  onChange={(value) => {
                    setAssets({ ...assets, component: value });
                    setErrors((prev) => ({ ...prev, component: "" }));
                  }}
                  error={errors.component}
                  placeholder="Componente del menu"
                  options={components}
                  clearable={true}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="moduleIdUpdate"
                  label="Modulo del menu"
                  value={assets.moduleId}
                  onChange={(value) => {
                    setAssets({ ...assets, moduleId: value });
                    setErrors((prev) => ({ ...prev, moduleId: "" }));
                  }}
                  error={errors.moduleId}
                  placeholder="Modulo del menu"
                  options={modules}
                  required={true}
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="parentIdUpdate"
                  label="Menú principal"
                  value={assets.parentId}
                  onChange={(value) =>
                    setAssets({ ...assets, parentId: value })
                  }
                  error={errors.parentId}
                  placeholder="Menú principal"
                  options={parents}
                  clearable={true}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="statusUpdate"
                  label="Estado"
                  value={assets.status}
                  onChange={(value) => {
                    setAssets({ ...assets, status: value });
                    setErrors((prev) => ({ ...prev, status: "" }));
                  }}
                  error={errors.status}
                  placeholder="Estado"
                  options={[
                    { id: "ACTIVE", name: "Activo" },
                    { id: "INACTIVE", name: "Inactivo" },
                  ]}
                  required={true}
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
