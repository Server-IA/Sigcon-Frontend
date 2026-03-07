import { useState, useEffect, useRef } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

import { useDispatch } from "react-redux";
import { refreshMenu } from "../../../routes/routes";

const CreateAssets = ({
  modalRef,
  modalInstance,
  assets,
  setAssets,
  dataTableRef,
  setAssetsCreate,
  modules,
  parents,
  components,
}) => {
  const dispatch = useDispatch();
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({
    message: "",
    type: "",
    show: false,
  });

  const [optionAssets, setOptionAssets] = useState([]);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        setError({ message: "", type: "", show: false });
        setErrors({});
      });
    }
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener("hidden.bs.modal", () => {
          setError({ message: "", type: "", show: false });
          setErrors({});
        });
      }
    };
  }, [modalRef.current]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = base_url(["api", "assets", "store"]);
      await fetchHelper.post(url, assets, {}, 1000);
      dispatch(refreshAssets());
      setAssets({
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
      });
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setAssetsCreate(true);
      setErrors({});
      setErrorMessage("");
    } catch (error) {
      console.error(error.msg);
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
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title" id="modalCenterTitle">
              Agregar Activo
            </h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <p className="text-muted m-0">
              <a
                href="https://remixicon.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="ri-information-line"></i> Iconos de Remix Icon{" "}
                <small>(Abrir en nueva pestaña)</small>
              </a>
            </p>

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
                  id="label"
                  label="Nombre del activo"
                  value={assets.label}
                  onChange={(e) => {
                    setAssets({ ...assets, label: e.target.value });
                    setErrors((prev) => ({
                      ...prev,
                      label: "",
                    }));
                  }}
                  error={errors.label}
                  placeholder="Nombre del activo"
                  required={true}
                />
              </div>

              <div className="col mb-6 mt-2">
                <InputModal
                  type="text"
                  id="path"
                  label="Ruta del activo"
                  value={assets.path}
                  onChange={(e) => {
                    setAssets({ ...assets, path: e.target.value });
                    setErrors((prev) => ({
                      ...prev,
                      path: "",
                    }));
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
                  id="icon"
                  label="Icono del activo"
                  value={assets.icon}
                  onChange={(e) => {
                    setAssets({ ...assets, icon: e.target.value });
                    setErrors((prev) => ({
                      ...prev,
                      icon: "",
                    }));
                  }}
                  error={errors.icon}
                  placeholder="Icono del activo"
                />
              </div>
              <div className="col mb-6 mt-2">
                <InputModal
                  type="number"
                  id="menuOrder"
                  label="Orden del menu"
                  value={assets.menuOrder}
                  onChange={(e) => {
                    setAssets({
                      ...assets,
                      menuOrder: e.target.value ? parseInt(e.target.value) : 1,
                    });
                    setErrors((prev) => ({
                      ...prev,
                      menuOrder: "",
                    }));
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
                  id="component"
                  label="Componente del menu"
                  value={assets.component}
                  onChange={(value) => {
                    setAssets({ ...assets, component: value });
                    setErrors((prev) => ({
                      ...prev,
                      component: "",
                    }));
                  }}
                  error={errors.component}
                  placeholder="Componente del menu"
                  options={components}
                  clearable={true}
                />
              </div>
              <div className="col mb-6 mt-2">
                <InputSelectModal
                  id="moduleId"
                  label="Modulo del menu"
                  value={assets.moduleId}
                  onChange={(value) => {
                    setAssets({
                      ...assets,
                      moduleId: value,
                    });
                    setErrors((prev) => ({
                      ...prev,
                      moduleId: "",
                    }));
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
                  id="parentId"
                  label="Menú principal"
                  value={assets.parentId}
                  onChange={(value) =>
                    setAssets({
                      ...assets,
                      parentId: value,
                    })
                  }
                  error={errors.parentId}
                  placeholder="Menú principal"
                  options={optionAssets}
                  clearable={true}
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
              onClick={handleSubmit}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssets;
