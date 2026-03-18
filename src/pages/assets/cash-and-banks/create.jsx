
const BANK_TYPES = [
  { id: "COMERCIAL", label: "Comercial" },
  { id: "COOPERATIVO", label: "Cooperativo" },
  { id: "PUBLICO", label: "Publico" },
  { id: "EXTRANJERO", label: "Extranjero" },
];

const EXTRACT_FORMATS = [
  { id: "CSV", label: "CSV" },
  { id: "TXT", label: "TXT" },
  { id: "EXCEL", label: "EXCEL" },
  { id: "API", label: "API" },
];
import { useState } from "react";

import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import TextareaModal from "../../../components/molecules/TextareaModal";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";



const API_STORE = ["api", "v1", "cash-and-banks", "store"];

const backendErrorMap = {
  CODIGO_BANCO: "BNK-ERR-034: Codigo de banco ya registrado",
  NOMBRE_BANCO: "BNK-ERR-035: Nombre de banco ya registrado",
  NIT_BANCO: "BNK-ERR-036: NIT de banco ya registrado",
};

const CreateCashAndBanks = ({
  modalRef,
  modalInstance,
  bank,
  setBank,
  dataTableRef,
  setBankCreate,
  countries,
}) => {
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const handleBackendErrors = (error) => {
    const apiErrors = error?.errors;
    if (apiErrors?.length > 0) {
      const fieldErrors = {};
      apiErrors.forEach((err) => {
        const field = err.field || err.path;
        fieldErrors[field] = backendErrorMap[field] || err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const msg = String(error?.msg || "");
    if (msg.toLowerCase().includes("codigo") && msg.toLowerCase().includes("duplic")) {
      setErrors((prev) => ({ ...prev, CODIGO_BANCO: backendErrorMap.CODIGO_BANCO }));
      return;
    }
    if (msg.toLowerCase().includes("nombre") && msg.toLowerCase().includes("duplic")) {
      setErrors((prev) => ({ ...prev, NOMBRE_BANCO: backendErrorMap.NOMBRE_BANCO }));
      return;
    }
    if (msg.toLowerCase().includes("nit") && msg.toLowerCase().includes("duplic")) {
      setErrors((prev) => ({ ...prev, NIT_BANCO: backendErrorMap.NIT_BANCO }));
      return;
    }

    setErrorMessage(error?.msg || "BNK-ERR-042: Error al guardar la informacion, intente nuevamente");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: validationErrors, normalized } = validateBankForm({
      bank,
      countries,
    });

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    const payload = buildBankPayload({
      ...normalized,
      ESTADO: "ACTIVE",
    });

    try {
      const url = base_url(API_STORE);
      await fetchHelper.post(url, payload, {}, 1000, true);

      setBank({ ...INITIAL_BANK });
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setBankCreate(true);
      setErrors({});
      setErrorMessage("");
    } catch (error) {
      handleBackendErrors(error);
    }
  };

  const handleClear = () => {
    setBank({ ...INITIAL_BANK });
    setErrors({});
    setErrorMessage("");
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title fw-bold">Crear banco</h4>
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
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="CODIGO_BANCO"
                  label="Codigo banco"
                  value={bank.CODIGO_BANCO}
                  onChange={(e) => {
                    setBank({ ...bank, CODIGO_BANCO: sanitizeUpperAlphaNum(e.target.value) });
                    setErrors({ ...errors, CODIGO_BANCO: "" });
                  }}
                  error={errors.CODIGO_BANCO}
                  placeholder="Ej: BAN001"
                  required
                />
              </div>
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="NIT_BANCO"
                  label="NIT"
                  value={bank.NIT_BANCO}
                  onChange={(e) => {
                    setBank({ ...bank, NIT_BANCO: sanitizeNit(e.target.value) });
                    setErrors({ ...errors, NIT_BANCO: "" });
                  }}
                  error={errors.NIT_BANCO}
                  placeholder="Ej: 900123456-7"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="NOMBRE_BANCO"
                  label="Nombre banco"
                  value={bank.NOMBRE_BANCO}
                  onChange={(e) => {
                    setBank({ ...bank, NOMBRE_BANCO: sanitizeSimpleText(e.target.value, 100) });
                    setErrors({ ...errors, NOMBRE_BANCO: "" });
                  }}
                  error={errors.NOMBRE_BANCO}
                  placeholder="Nombre oficial del banco"
                  required
                />
              </div>
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="NOMBRE_CORTO"
                  label="Nombre corto"
                  value={bank.NOMBRE_CORTO}
                  onChange={(e) => {
                    setBank({ ...bank, NOMBRE_CORTO: sanitizeSimpleText(e.target.value, 50) });
                    setErrors({ ...errors, NOMBRE_CORTO: "" });
                  }}
                  error={errors.NOMBRE_CORTO}
                  placeholder="Nombre abreviado"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id="TIPO_BANCO"
                  label="Tipo banco"
                  value={bank.TIPO_BANCO}
                  onChange={(value) => {
                    setBank({ ...bank, TIPO_BANCO: value });
                    setErrors({ ...errors, TIPO_BANCO: "" });
                  }}
                  error={errors.TIPO_BANCO}
                  options={BANK_TYPES}
                  required
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id="PAIS_CODIGO"
                  label="Pais"
                  value={bank.PAIS_CODIGO}
                  onChange={(value) => {
                    setBank({ ...bank, PAIS_CODIGO: sanitizeCountryCode(value) });
                    setErrors({ ...errors, PAIS_CODIGO: "" });
                  }}
                  error={errors.PAIS_CODIGO}
                  options={countries}
                  required
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="CODIGO_SWIFT"
                  label="Codigo SWIFT"
                  value={bank.CODIGO_SWIFT}
                  onChange={(e) => {
                    setBank({ ...bank, CODIGO_SWIFT: sanitizeSwift(e.target.value) });
                    setErrors({ ...errors, CODIGO_SWIFT: "" });
                  }}
                  error={errors.CODIGO_SWIFT}
                  placeholder="Ej: BCOLOCOXXXX"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="CODIGO_ACH"
                  label="Codigo ACH"
                  value={bank.CODIGO_ACH}
                  onChange={(e) => {
                    setBank({ ...bank, CODIGO_ACH: sanitizeUpperAlphaNum(e.target.value) });
                    setErrors({ ...errors, CODIGO_ACH: "" });
                  }}
                  error={errors.CODIGO_ACH}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="CIUDAD_PRINCIPAL"
                  label="Ciudad principal"
                  value={bank.CIUDAD_PRINCIPAL}
                  onChange={(e) => {
                    setBank({ ...bank, CIUDAD_PRINCIPAL: sanitizeSimpleText(e.target.value, 100) });
                  }}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="TELEFONO_PRINCIPAL"
                  label="Telefono principal"
                  value={bank.TELEFONO_PRINCIPAL}
                  onChange={(e) => {
                    setBank({ ...bank, TELEFONO_PRINCIPAL: sanitizeSimpleText(e.target.value, 20) });
                  }}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-8 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="DIRECCION_PRINCIPAL"
                  label="Direccion principal"
                  value={bank.DIRECCION_PRINCIPAL}
                  onChange={(e) => {
                    setBank({ ...bank, DIRECCION_PRINCIPAL: sanitizeSimpleText(e.target.value, 100) });
                  }}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="number"
                  id="DIAS_CONCILIACION"
                  label="Dias conciliacion"
                  value={bank.DIAS_CONCILIACION}
                  onChange={(e) => {
                    setBank({ ...bank, DIAS_CONCILIACION: e.target.value });
                    setErrors({ ...errors, DIAS_CONCILIACION: "" });
                  }}
                  error={errors.DIAS_CONCILIACION}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id="FORMATO_EXTRACTO"
                  label="Formato extracto"
                  value={bank.FORMATO_EXTRACTO}
                  onChange={(value) => {
                    setBank({
                      ...bank,
                      FORMATO_EXTRACTO: value,
                      URL_WEBSERVICE: value === "API" ? bank.URL_WEBSERVICE : "",
                    });
                    setErrors({ ...errors, FORMATO_EXTRACTO: "", URL_WEBSERVICE: "" });
                  }}
                  options={EXTRACT_FORMATS}
                />
              </div>
              <div className="col-lg-8 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="URL_WEBSERVICE"
                  label="URL webservice"
                  value={bank.URL_WEBSERVICE}
                  onChange={(e) => {
                    setBank({ ...bank, URL_WEBSERVICE: sanitizeSimpleText(e.target.value, 500) });
                    setErrors({ ...errors, URL_WEBSERVICE: "" });
                  }}
                  error={errors.URL_WEBSERVICE}
                  placeholder="https://..."
                  required={bank.FORMATO_EXTRACTO === "API"}
                  disabled={bank.FORMATO_EXTRACTO !== "API"}
                />
              </div>
            </div>

            <div className="row">
              <TextareaModal
                id="estado_default"
                label="Estado"
                value="Activo (asignado por defecto al crear)"
                onChange={() => {}}
              />
            </div>
          </div>
          <div className="modal-footer justify-content-start">
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Guardar banco
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
              Limpiar
            </button>
            <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCashAndBanks;
