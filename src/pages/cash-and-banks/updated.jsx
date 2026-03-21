const BANK_STATUS_OPTIONS = [
  { id: "ACTIVE", label: "Activo" },
  { id: "INACTIVE", label: "Inactivo" },
];

const BANK_TYPES = [
  { id: "COMMERCIAL", label: "Comercial" },
  { id: "COOPERATIVE", label: "Cooperativo" },
  { id: "PUBLIC", label: "Publico" },
  { id: "FOREIGN", label: "Extranjero" },
];

const EXTRACT_FORMATS = [
  { id: "CSV", label: "CSV" },
  { id: "TXT", label: "TXT" },
  { id: "EXCEL", label: "EXCEL" },
  { id: "API", label: "API" },
];
import { useMemo, useState } from "react";

import AlertPage from "../../components/molecules/AlertPage";
import InputModal from "../../components/molecules/InputModal";
import InputSelectModal from "../../components/molecules/inputSelectModal";
import TextareaModal from "../../components/molecules/TextareaModal";

import { base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";
import {
  sanitizeUpperAlphaNum,
  sanitizeNit,
  sanitizeSimpleText,
  sanitizeSwift,
} from "../../utils/bankUtils";



const API_BASE = ["api", "v1", "banks"];

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
  status: bank.ESTADO || "ACTIVE",
});

const validateBankForm = ({ bank, sensitiveChanged }) => {
  const nextErrors = {};

  if (!bank.CODIGO_BANCO) nextErrors.CODIGO_BANCO = "Codigo requerido";
  if (!bank.NIT_BANCO) nextErrors.NIT_BANCO = "NIT requerido";
  if (!bank.NOMBRE_BANCO) nextErrors.NOMBRE_BANCO = "Nombre requerido";
  if (!bank.NOMBRE_CORTO) nextErrors.NOMBRE_CORTO = "Nombre corto requerido";
  if (!bank.TIPO_BANCO) nextErrors.TIPO_BANCO = "Tipo de banco requerido";
  if (!bank.PAIS_ID) nextErrors.PAIS_ID = "Pais requerido";
  if (!bank.CODIGO_SWIFT) nextErrors.CODIGO_SWIFT = "Codigo SWIFT requerido";
  if (!bank.ESTADO) nextErrors.ESTADO = "Estado requerido";
  if (bank.FORMATO_EXTRACTO === "API" && !bank.URL_WEBSERVICE) {
    nextErrors.URL_WEBSERVICE = "URL webservice requerida";
  }
  if (sensitiveChanged && (!bank.MOTIVO_CAMBIO || bank.MOTIVO_CAMBIO.trim().length < 10)) {
    nextErrors.MOTIVO_CAMBIO = "Motivo de cambio requerido";
  }

  return {
    isValid: Object.keys(nextErrors).length === 0,
    errors: nextErrors,
  };
};

const UpdatedCashAndBanks = ({
  modalRef,
  modalInstance,
  bank,
  setBank,
  originalBank,
  dataTableRef,
  setBankUpdate,
  countries,
  readOnly = false,
}) => {
  const sfx = readOnly ? "view" : "update";
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const sensitiveChanged = useMemo(() => {
    if (!originalBank) return false;
    return (
      bank.NOMBRE_BANCO !== originalBank.NOMBRE_BANCO ||
      bank.NIT_BANCO !== originalBank.NIT_BANCO ||
      bank.ESTADO !== originalBank.ESTADO
    );
  }, [bank, originalBank]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    const validation = validateBankForm({
      bank,
      countries,
      originalBank,
      sensitiveChanged,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      const url = base_url([...API_BASE, bank.ID_BANCO]);
      await fetchHelper.put(url, buildBankPayload(bank), {}, 1000, true);
      dataTableRef?.current?.ajax.reload();
      modalInstance?.current?.hide();
      setBankUpdate(true);
      setErrors({});
      setErrorMessage("");
    } catch (error) {
      const apiErrors = error?.errors;
      if (apiErrors?.length > 0) {
        const fieldErrors = {};
        apiErrors.forEach((err) => {
          const field = err.field || err.path;
          const uiField = apiFieldToUiField[field] || field;
          fieldErrors[uiField] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
      setErrorMessage(error?.msg || "BNK-ERR-054: Error al guardar la informacion, intente nuevamente");
    }
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title fw-bold">{readOnly ? "Ver banco" : "Editar banco"}</h4>
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
              <div className="col-lg-3 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`ID_BANCO_${sfx}`}
                  label="Identificador"
                  value={bank.ID_BANCO ?? ""}
                  readOnly
                />
              </div>
              <div className="col-lg-5 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`CODIGO_BANCO_${sfx}`}
                  label="Codigo banco"
                  value={bank.CODIGO_BANCO ?? ""}
                  onChange={(e) => {
                    if (readOnly || bank.HAS_ASSOCIATED_ACCOUNTS) return;
                    setBank({ ...bank, CODIGO_BANCO: sanitizeUpperAlphaNum(e.target.value) });
                    setErrors({ ...errors, CODIGO_BANCO: "" });
                  }}
                  error={errors.CODIGO_BANCO}
                  required={!readOnly}
                  readOnly={readOnly || bank.HAS_ASSOCIATED_ACCOUNTS}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`NIT_BANCO_${sfx}`}
                  label="NIT"
                  value={bank.NIT_BANCO ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, NIT_BANCO: sanitizeNit(e.target.value) });
                    setErrors({ ...errors, NIT_BANCO: "" });
                  }}
                  error={errors.NIT_BANCO}
                  required={!readOnly}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`NOMBRE_BANCO_${sfx}`}
                  label="Nombre banco"
                  value={bank.NOMBRE_BANCO ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, NOMBRE_BANCO: sanitizeSimpleText(e.target.value, 100) });
                    setErrors({ ...errors, NOMBRE_BANCO: "" });
                  }}
                  error={errors.NOMBRE_BANCO}
                  required={!readOnly}
                  readOnly={readOnly}
                />
              </div>
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`NOMBRE_CORTO_${sfx}`}
                  label="Nombre corto"
                  value={bank.NOMBRE_CORTO ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, NOMBRE_CORTO: sanitizeSimpleText(e.target.value, 50) });
                    setErrors({ ...errors, NOMBRE_CORTO: "" });
                  }}
                  error={errors.NOMBRE_CORTO}
                  required={!readOnly}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id={`TIPO_BANCO_${sfx}`}
                  label="Tipo banco"
                  value={bank.TIPO_BANCO ?? ""}
                  onChange={(value) => {
                    if (readOnly) return;
                    setBank({ ...bank, TIPO_BANCO: value });
                    setErrors({ ...errors, TIPO_BANCO: "" });
                  }}
                  options={BANK_TYPES}
                  error={errors.TIPO_BANCO}
                  required={!readOnly}
                  disabled={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id={`PAIS_ID_${sfx}`}
                  label="Pais"
                  value={bank.PAIS_ID ?? ""}
                  onChange={(value) => {
                    if (readOnly) return;
                    setBank({ ...bank, PAIS_ID: Number(value) || null });
                    setErrors({ ...errors, PAIS_ID: "" });
                  }}
                  options={countries}
                  error={errors.PAIS_ID}
                  required={!readOnly}
                  disabled={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`CODIGO_SWIFT_${sfx}`}
                  label="Codigo SWIFT"
                  value={bank.CODIGO_SWIFT ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, CODIGO_SWIFT: sanitizeSwift(e.target.value) });
                    setErrors({ ...errors, CODIGO_SWIFT: "" });
                  }}
                  error={errors.CODIGO_SWIFT}
                  required={!readOnly}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`CODIGO_ACH_${sfx}`}
                  label="Codigo ACH"
                  value={bank.CODIGO_ACH ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, CODIGO_ACH: sanitizeUpperAlphaNum(e.target.value) });
                    setErrors({ ...errors, CODIGO_ACH: "" });
                  }}
                  error={errors.CODIGO_ACH}
                  readOnly={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`CIUDAD_PRINCIPAL_${sfx}`}
                  label="Ciudad principal"
                  value={bank.CIUDAD_PRINCIPAL ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, CIUDAD_PRINCIPAL: sanitizeSimpleText(e.target.value, 100) });
                  }}
                  readOnly={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`TELEFONO_PRINCIPAL_${sfx}`}
                  label="Telefono principal"
                  value={bank.TELEFONO_PRINCIPAL ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, TELEFONO_PRINCIPAL: sanitizeSimpleText(e.target.value, 20) });
                  }}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-8 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`DIRECCION_PRINCIPAL_${sfx}`}
                  label="Direccion principal"
                  value={bank.DIRECCION_PRINCIPAL ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, DIRECCION_PRINCIPAL: sanitizeSimpleText(e.target.value, 100) });
                  }}
                  readOnly={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="number"
                  id={`DIAS_CONCILIACION_${sfx}`}
                  label="Dias conciliacion"
                  value={bank.DIAS_CONCILIACION ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, DIAS_CONCILIACION: e.target.value });
                    setErrors({ ...errors, DIAS_CONCILIACION: "" });
                  }}
                  error={errors.DIAS_CONCILIACION}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id={`FORMATO_EXTRACTO_${sfx}`}
                  label="Formato extracto"
                  value={bank.FORMATO_EXTRACTO ?? ""}
                  onChange={(value) => {
                    if (readOnly) return;
                    setBank({
                      ...bank,
                      FORMATO_EXTRACTO: value,
                      URL_WEBSERVICE: value === "API" ? bank.URL_WEBSERVICE : "",
                    });
                    setErrors({ ...errors, URL_WEBSERVICE: "" });
                  }}
                  options={EXTRACT_FORMATS}
                  disabled={readOnly}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`URL_WEBSERVICE_${sfx}`}
                  label="URL webservice"
                  value={bank.URL_WEBSERVICE ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    setBank({ ...bank, URL_WEBSERVICE: sanitizeSimpleText(e.target.value, 500) });
                    setErrors({ ...errors, URL_WEBSERVICE: "" });
                  }}
                  error={errors.URL_WEBSERVICE}
                  disabled={readOnly || bank.FORMATO_EXTRACTO !== "API"}
                  readOnly={readOnly}
                  required={!readOnly && bank.FORMATO_EXTRACTO === "API"}
                />
              </div>
              <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
                <InputSelectModal
                  id={`ESTADO_${sfx}`}
                  label="Estado"
                  value={bank.ESTADO ?? "ACTIVE"}
                  onChange={(value) => {
                    if (readOnly) return;
                    setBank({ ...bank, ESTADO: value });
                    setErrors({ ...errors, ESTADO: "" });
                  }}
                  options={BANK_STATUS_OPTIONS}
                  error={errors.ESTADO}
                  required={!readOnly}
                  disabled={readOnly}
                />
              </div>
            </div>

            {!readOnly && sensitiveChanged && (
              <div className="row">
                <div className="col-12 mb-3">
                  <TextareaModal
                    id={`MOTIVO_CAMBIO_${sfx}`}
                    label="Motivo de cambio (requerido para nombre, NIT o estado)"
                    value={bank.MOTIVO_CAMBIO ?? ""}
                    onChange={(e) => {
                      setBank({ ...bank, MOTIVO_CAMBIO: sanitizeSimpleText(e.target.value, 500) });
                      setErrors({ ...errors, MOTIVO_CAMBIO: "" });
                    }}
                    error={errors.MOTIVO_CAMBIO}
                    placeholder="Describa el motivo del cambio (minimo 10 caracteres)"
                    required
                  />
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer justify-content-start">
            {!readOnly && (
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                Guardar cambios
              </button>
            )}
            <button
              type="button"
              className={`btn btn-danger ${readOnly ? "" : "ms-auto"}`}
              data-bs-dismiss="modal"
            >
              {readOnly ? "Cerrar" : "Volver"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatedCashAndBanks;
