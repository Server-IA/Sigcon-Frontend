const BANK_STATUS_OPTIONS = [
  { id: "ACTIVE", label: "Activo" },
  { id: "INACTIVE", label: "Inactivo" },
];

const BANK_TYPES = [
  { id: "COMMERCIAL", name: "Comercial", label: "Comercial" },
  { id: "COOPERATIVE", name: "Cooperativo", label: "Cooperativo" },
  { id: "PUBLIC", name: "Publico", label: "Publico" },
  { id: "FOREIGN", name: "Extranjero", label: "Extranjero" },
];

const EXTRACT_FORMATS = [
  { id: "NONE", label: "No se permite extracto" },
  { id: "CSV", label: "CSV" },
  { id: "TXT", label: "TXT" },
  { id: "EXCEL", label: "EXCEL" },
  { id: "API", label: "API" },
];
import { useMemo, useState } from "react";

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

// QA BNK (2026-06-03) BNK-RF-07: longitud + clase de caracteres por campo
// segun "VALIDACIONES CAMPOS BNK Y CAJAS". El codigo y el pais son inmutables.
const validateBankForm = ({ bank, sensitiveChanged }) => {
  const nextErrors = {};

  if (!bank.CODIGO_BANCO) nextErrors.CODIGO_BANCO = "Codigo requerido";
  nextErrors.NIT_BANCO = validateText(bank.NIT_BANCO, { required: true, min: 5, max: 45, patternKey: "nit", label: "El NIT" });
  nextErrors.NOMBRE_BANCO = validateText(bank.NOMBRE_BANCO, { required: true, min: 5, max: 100, patternKey: "bankFullName", label: "El nombre del banco" });
  nextErrors.NOMBRE_CORTO = validateText(bank.NOMBRE_CORTO, { required: true, min: 2, max: 45, patternKey: "bankShortName", label: "El nombre corto" });
  if (!bank.TIPO_BANCO) nextErrors.TIPO_BANCO = "Tipo de banco requerido";
  if (!bank.PAIS_ID) nextErrors.PAIS_ID = "Pais requerido";
  nextErrors.CODIGO_SWIFT = validateText(bank.CODIGO_SWIFT, { required: true, min: 8, max: 30, patternKey: "swift", label: "El código SWIFT" });
  nextErrors.CODIGO_ACH = validateText(bank.CODIGO_ACH, { required: false, min: 0, max: 45, patternKey: "ach", label: "El código ACH" });
  nextErrors.DIAS_CONCILIACION = validateNumber(bank.DIAS_CONCILIACION, { required: false, min: 1, max: 31, integer: true, label: "Los días de conciliación" });
  if (!bank.ESTADO) nextErrors.ESTADO = "Estado requerido";
  if (bank.FORMATO_EXTRACTO === "API" && !bank.URL_WEBSERVICE) {
    nextErrors.URL_WEBSERVICE = "URL webservice requerida";
  }
  if (sensitiveChanged) {
    nextErrors.MOTIVO_CAMBIO = validateText(bank.MOTIVO_CAMBIO, { required: true, min: 10, max: 500, patternKey: "description", label: "El motivo del cambio" });
  }

  Object.keys(nextErrors).forEach((k) => { if (nextErrors[k] == null) delete nextErrors[k]; });

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

  // QA Bloque AU+ Bug 2 (2026-05-07): cualquier cambio en un campo editable
  // requiere motivo de auditoria. Antes solo se exigia para nombre, NIT y
  // estado. Ahora cubre TODOS los campos editables (NIT, nombres, tipo,
  // SWIFT, ACH, dias conciliacion, estado).
  const sensitiveChanged = useMemo(() => {
    if (!originalBank) return false;
    return (
      bank.NOMBRE_BANCO !== originalBank.NOMBRE_BANCO ||
      bank.NIT_BANCO !== originalBank.NIT_BANCO ||
      bank.ESTADO !== originalBank.ESTADO ||
      bank.NOMBRE_CORTO !== originalBank.NOMBRE_CORTO ||
      bank.TIPO_BANCO !== originalBank.TIPO_BANCO ||
      bank.CODIGO_SWIFT !== originalBank.CODIGO_SWIFT ||
      bank.CODIGO_ACH !== originalBank.CODIGO_ACH ||
      String(bank.DIAS_CONCILIACION ?? '') !== String(originalBank.DIAS_CONCILIACION ?? '')
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
                {/* QA Bloque AU+ Bug 2 (2026-05-07): el codigo del banco
                    es inmutable una vez creado (identifica el catalogo y
                    podria romper trazabilidad de cuentas/movimientos). */}
                <InputModal
                  type="text"
                  id={`CODIGO_BANCO_${sfx}`}
                  label="Codigo banco (no editable)"
                  value={bank.CODIGO_BANCO ?? ""}
                  onChange={() => { /* inmutable */ }}
                  error={errors.CODIGO_BANCO}
                  required={!readOnly}
                  readOnly
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
                  maxLength={45}
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
                  maxLength={100}
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
                    setBank({ ...bank, NOMBRE_CORTO: sanitizeSimpleText(e.target.value, 45) });
                    setErrors({ ...errors, NOMBRE_CORTO: "" });
                  }}
                  error={errors.NOMBRE_CORTO}
                  maxLength={45}
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
                {/* QA Bloque AU+ Bug 2 (2026-05-07): el pais es inmutable
                    una vez creado (afecta moneda, regimen tributario y
                    sucursales asociadas). */}
                <InputSelectModal
                  id={`PAIS_ID_${sfx}`}
                  label="Pais (no editable)"
                  value={bank.PAIS_ID ?? ""}
                  onChange={() => { /* inmutable */ }}
                  options={countries}
                  error={errors.PAIS_ID}
                  required={!readOnly}
                  disabled
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
                  maxLength={30}
                  required={!readOnly}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                <InputModal
                  type="text"
                  id={`CODIGO_ACH_${sfx}`}
                  label="Codigo ACH"
                  value={bank.CODIGO_ACH ?? ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    // BNK-RF-07: ACH admite alfanumericos y guiones.
                    setBank({ ...bank, CODIGO_ACH: e.target.value.replace(/[^A-Za-z0-9-]/g, "") });
                    setErrors({ ...errors, CODIGO_ACH: "" });
                  }}
                  error={errors.CODIGO_ACH}
                  maxLength={45}
                  readOnly={readOnly}
                />
              </div>
              <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
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
                  min={1}
                  max={31}
                  readOnly={readOnly}
                />
              </div>
              {/* <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
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
              </div> */}
              {/* <div className="col-lg-4 col-md-12 col-sm-12 mb-3">
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
              </div> */}
            </div>

            {/* <div className="row"> */}
              {/* <div className="col-lg-8 col-md-12 col-sm-12 mb-3">
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
              </div> */}
            {/* </div> */}

            {/* QA Bloque AU+ (2026-05-07) Bug 2: Formato extracto + URL webservice
                removidos del form de edicion de banco. Pertenecen al modulo de
                conciliacion bancaria. */}
            <div className="row">
              <div className="col-lg-12 col-md-12 col-sm-12 mb-3">
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
                    label="Motivo de cambio (obligatorio para cualquier modificacion - minimo 10 caracteres)"
                    value={bank.MOTIVO_CAMBIO ?? ""}
                    onChange={(e) => {
                      setBank({ ...bank, MOTIVO_CAMBIO: sanitizeSimpleText(e.target.value, 500) });
                      setErrors({ ...errors, MOTIVO_CAMBIO: "" });
                    }}
                    error={errors.MOTIVO_CAMBIO}
                    placeholder="Describa el motivo del cambio (entre 10 y 500 caracteres)"
                    maxLength={500}
                    rows={4}
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
