
const BANK_TYPES = [
  { id: "COMMERCIAL", label: "Comercial" },
  { id: "COOPERATIVE", label: "Cooperativo" },
  { id: "PUBLIC", label: "Publico" },
  { id: "FOREIGN", label: "Extranjero" },
];

const EXTRACT_FORMATS = [
  { id: "NONE", label: "No se permite extracto" },
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
import {
  sanitizeUpperAlphaNum,
  sanitizeNit,
  sanitizeSimpleText,
  sanitizeSwift,
} from "../../../utils/bankUtils";
import { validateText, validateNumber } from "../../../utils/fieldValidations";



const API_STORE = ["api", "v1", "banks", "store"];

const INITIAL_BANK = {
  ID_BANCO: null,
  CODIGO_BANCO: "",
  NOMBRE_BANCO: "",
  NOMBRE_CORTO: "",
  TIPO_BANCO: "",
  NIT_BANCO: "",
  PAIS_ID: null,
  CODIGO_SWIFT: "",
  CODIGO_ACH: "",
  CIUDAD_PRINCIPAL: "",
  DIRECCION_PRINCIPAL: "",
  TELEFONO_PRINCIPAL: "",
  FORMATO_EXTRACTO: "",
  URL_WEBSERVICE: "",
  DIAS_CONCILIACION: "",
  ESTADO: "ACTIVE",
  MOTIVO_CAMBIO: "",
  MOTIVO_ELIMINACION: "",
  HAS_ASSOCIATED_ACCOUNTS: false,
  HAS_ACTIVE_ASSOCIATED_ACCOUNTS: false,
};

const backendErrorMap = {
  CODIGO_BANCO: "BNK-ERR-034: Codigo de banco ya registrado",
  NOMBRE_BANCO: "BNK-ERR-035: Nombre de banco ya registrado",
  NIT_BANCO: "BNK-ERR-036: NIT de banco ya registrado",
};

const apiFieldToUiField = {
  code: "CODIGO_BANCO",
  name: "NOMBRE_BANCO",
  nameShort: "NOMBRE_CORTO",
  typeBank: "TIPO_BANCO",
  nit: "NIT_BANCO",
  countryId: "PAIS_ID",
  swift: "CODIGO_SWIFT",
  codeAch: "CODIGO_ACH",
  urlWebservice: "URL_WEBSERVICE",
  conciliationDays: "DIAS_CONCILIACION",
  phone: "TELEFONO_PRINCIPAL",
  formatExtract: "FORMATO_EXTRACTO",
};

const buildBankPayload = (bank) => ({
  code: bank.CODIGO_BANCO?.trim() || "",
  name: bank.NOMBRE_BANCO?.trim() || "",
  nameShort: bank.NOMBRE_CORTO?.trim() || "",
  typeBank: bank.TIPO_BANCO || "",
  nit: bank.NIT_BANCO?.trim() || "",
  swift: bank.CODIGO_SWIFT?.trim() || "",
  codeAch: bank.CODIGO_ACH?.trim() || null,
  urlWebservice: bank.URL_WEBSERVICE?.trim() || null,
  conciliationDays: bank.DIAS_CONCILIACION ? Number(bank.DIAS_CONCILIACION) : null,
  phone: bank.TELEFONO_PRINCIPAL?.trim() || null,
  formatExtract: bank.FORMATO_EXTRACTO || null,
  countryId: bank.PAIS_ID ? Number(bank.PAIS_ID) : null,
});

// QA BNK (2026-06-03) BNK-RF-05: longitud + clase de caracteres por campo
// segun "VALIDACIONES CAMPOS BNK Y CAJAS".
const validateBankForm = ({ bank }) => {
  const nextErrors = {};

  nextErrors.CODIGO_BANCO = validateText(bank.CODIGO_BANCO, { required: true, min: 3, max: 45, patternKey: "bankCode", label: "El código del banco" });
  nextErrors.NIT_BANCO = validateText(bank.NIT_BANCO, { required: true, min: 5, max: 45, patternKey: "nit", label: "El NIT" });
  nextErrors.NOMBRE_BANCO = validateText(bank.NOMBRE_BANCO, { required: true, min: 5, max: 100, patternKey: "bankFullName", label: "El nombre del banco" });
  nextErrors.NOMBRE_CORTO = validateText(bank.NOMBRE_CORTO, { required: true, min: 2, max: 45, patternKey: "bankShortName", label: "El nombre corto" });
  if (!bank.TIPO_BANCO) nextErrors.TIPO_BANCO = "Tipo de banco requerido";
  if (!bank.PAIS_ID) nextErrors.PAIS_ID = "Pais requerido";
  nextErrors.CODIGO_SWIFT = validateText(bank.CODIGO_SWIFT, { required: true, min: 8, max: 30, patternKey: "swift", label: "El código SWIFT" });
  nextErrors.CODIGO_ACH = validateText(bank.CODIGO_ACH, { required: true, min: 0, max: 45, patternKey: "ach", label: "El código ACH" });
  nextErrors.DIAS_CONCILIACION = validateNumber(bank.DIAS_CONCILIACION, { required: false, min: 1, max: 31, integer: true, label: "Los días de conciliación" });
  if (bank.FORMATO_EXTRACTO === "API" && !bank.URL_WEBSERVICE) {
    nextErrors.URL_WEBSERVICE = "URL webservice requerida";
  }

  Object.keys(nextErrors).forEach((k) => { if (nextErrors[k] == null) delete nextErrors[k]; });

  return {
    isValid: Object.keys(nextErrors).length === 0,
    errors: nextErrors,
  };
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
        const uiField = apiFieldToUiField[field] || field;
        fieldErrors[uiField] = backendErrorMap[uiField] || err.message;
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

    const { isValid, errors: validationErrors } = validateBankForm({
      bank,
      countries,
    });

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    const payload = buildBankPayload({
      ...bank,
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
                  maxLength={45}
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
                  maxLength={45}
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
                  maxLength={100}
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
                    setBank({ ...bank, NOMBRE_CORTO: sanitizeSimpleText(e.target.value, 45) });
                    setErrors({ ...errors, NOMBRE_CORTO: "" });
                  }}
                  error={errors.NOMBRE_CORTO}
                  placeholder="Nombre abreviado"
                  maxLength={45}
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
                  id="PAIS_ID"
                  label="Pais"
                  value={bank.PAIS_ID}
                  onChange={(value) => {
                    setBank({ ...bank, PAIS_ID: Number(value) || null });
                    setErrors({ ...errors, PAIS_ID: "" });
                  }}
                  error={errors.PAIS_ID}
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
                  maxLength={30}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id="CODIGO_ACH"
                  label="Codigo ACH"
                  value={bank.CODIGO_ACH}
                  onChange={(e) => {
                    // BNK-RF-05: ACH admite alfanumericos y guiones (no solo A-Z0-9).
                    setBank({ ...bank, CODIGO_ACH: e.target.value.replace(/[^A-Za-z0-9-]/g, "") });
                    setErrors({ ...errors, CODIGO_ACH: "" });
                  }}
                  error={errors.CODIGO_ACH}
                  placeholder="Código ACH"
                  maxLength={45}
                  required={true}
                />
              </div>
              
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
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
                  placeholder="Entre 1 y 31 (opcional)"
                  min={1}
                  max={31}
                />
              </div>
              {/* <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
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
              </div> */}
              {/* <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
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
              </div> */}
            </div>

            <div className="row">
              {/* <div className="col-lg-8 col-md-12 col-sm-12 mb-3">
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
              </div> */}
            </div>

            {/* QA Bloque AU+ (2026-05-07) Bug 2: campo "Formato extracto" +
                URL webservice removidos del form de creacion. La funcionalidad
                de importar extractos via API/CSV se gestiona desde el modulo
                de conciliacion bancaria, no desde el catalogo de bancos. */}

            {/* <div className="row">
              <TextareaModal
                id="estado_default"
                label="Estado"
                value="Activo (asignado por defecto al crear)"
                onChange={() => {}}
              />
            </div> */}
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
