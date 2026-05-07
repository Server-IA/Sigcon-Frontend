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
import { useState } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import {
  exactRegex,
  sanitizeUpperAlphaNum,
  sanitizeSimpleText,
  sanitizeCountryCode,
} from "../../../utils/bankUtils";



const initialFilters = {
  CODIGO_BANCO: "",
  NOMBRE_BANCO: "",
  NOMBRE_CORTO: "",
  TIPO_BANCO: "",
  PAIS_CODIGO: "",
  ESTADO: "",
};

const FilterCashAndBanks = ({
  filterRef,
  filterInstance,
  dataTableRef,
  countries,
  onApply,
}) => {
  const [filters, setFilters] = useState(initialFilters);

  const applyFiltersToTable = (nextFilters) => {
    const table = dataTableRef?.current;
    if (!table) return;

    // QA Bloque AU (2026-05-06) — Bug 2: nombre y nombre corto pasan a busqueda
    // EXACTA (regex=false). Antes el regex=true generaba LIKE en backend pero
    // el QA reporta que no devolvia matches y el label decia "(parcial)" lo
    // cual confundia al usuario.
    table.column("code:name").search(nextFilters.CODIGO_BANCO || "", false, false);
    table.column("name:name").search(nextFilters.NOMBRE_BANCO || "", false, false);
    table.column("nameShort:name").search(nextFilters.NOMBRE_CORTO || "", false, false);
    table.column("typeBank:name").search(nextFilters.TIPO_BANCO || "", false, false);
    table.column("country.code:name").search(nextFilters.PAIS_CODIGO || "", false, false);
    table.column("status:name").search(nextFilters.ESTADO || "", false, false);
    table.draw();
  };

  const handleApply = () => {
    applyFiltersToTable(filters);
    onApply?.(filters);
    filterInstance?.current?.hide();
  };

  // QA Bloque AU (2026-05-06) — Bug 3: Limpiar deja el modal abierto para
  // que el usuario vea los inputs vaciados (mismo patron Bloque AQ aplicado
  // en CFG). Cerrar el modal solo se hace por Cancelar/Cerrar o tras
  // Filtrar exitoso.
  const handleClear = () => {
    setFilters(initialFilters);
    applyFiltersToTable(initialFilters);
    onApply?.(initialFilters);
  };

  return (
    <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Filtrar bancos</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <InputModal
                  type="text"
                  id="CODIGO_BANCO_FILTER"
                  label="Codigo banco (exacto)"
                  value={filters.CODIGO_BANCO}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      CODIGO_BANCO: sanitizeUpperAlphaNum(e.target.value),
                    })
                  }
                  placeholder="Ej: BAN001"
                />
              </div>
              <div className="col-md-6 mb-3">
                <InputModal
                  type="text"
                  id="NOMBRE_BANCO_FILTER"
                  label="Nombre banco (exacto)"
                  value={filters.NOMBRE_BANCO}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      NOMBRE_BANCO: sanitizeSimpleText(e.target.value, 100),
                    })
                  }
                  placeholder="Nombre"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <InputModal
                  type="text"
                  id="NOMBRE_CORTO_FILTER"
                  label="Nombre corto (exacto)"
                  value={filters.NOMBRE_CORTO}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      NOMBRE_CORTO: sanitizeSimpleText(e.target.value, 50),
                    })
                  }
                  placeholder="Nombre corto"
                />
              </div>
              <div className="col-md-6 mb-3">
                <InputSelectModal
                  id="TIPO_BANCO_FILTER"
                  label="Tipo banco (exacto)"
                  options={BANK_TYPES}
                  value={filters.TIPO_BANCO}
                  onChange={(value) => setFilters({ ...filters, TIPO_BANCO: value || "" })}
                  clearable
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <InputSelectModal
                  id="PAIS_CODIGO_FILTER"
                  label="Pais (exacto)"
                  options={countries}
                  value={filters.PAIS_CODIGO}
                  onChange={(value) =>
                    setFilters({ ...filters, PAIS_CODIGO: sanitizeCountryCode(value || "") })
                  }
                  clearable
                />
              </div>
              <div className="col-md-6 mb-3">
                <InputSelectModal
                  id="ESTADO_FILTER"
                  label="Estado (exacto)"
                  options={BANK_STATUS_OPTIONS}
                  value={filters.ESTADO}
                  onChange={(value) => setFilters({ ...filters, ESTADO: value || "" })}
                  clearable
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={handleApply}>
              Filtrar
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClear}>
              Limpiar
            </button>
            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterCashAndBanks;
