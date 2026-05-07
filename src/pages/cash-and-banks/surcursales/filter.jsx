import { useState } from "react";

import InputSelectModal from "../../../components/molecules/inputSelectModal";

const MAIN_BRANCH_OPTIONS = [
  { id: "true", label: "Principal" },
  { id: "false", label: "Secundaria" },
];

const initialFilters = {
  municipalityId: "",
  mainBranch: "",
};

const FilterBankBranch = ({ filterRef, filterInstance, dataTableRef, onApply, municipalities = [] }) => {
  const [filters, setFilters] = useState(initialFilters);

  const applyFiltersToTable = (nextFilters) => {
    const table = dataTableRef?.current;
    if (!table) return;

    // QA Bloque AU (2026-05-06) — Bug 3a: el filtro Ciudad ahora pasa por
    // municipality.id (FK exacta) en lugar de buscar el nombre por LIKE.
    // El frontend usa el dropdown de municipalities ya cargado.
    table.column("municipality.id:name").search(nextFilters.municipalityId || "", false, false);

    // QA Bloque AU (2026-05-06) — Bug 3b: el backend interpreta mainBranch
    // como Boolean via Boolean.valueOf(). Antes el frontend enviaba
    // "Principal"/"Secundaria" (texto en español) y Boolean.valueOf("Principal")
    // retorna false, asi que ambos valores filtraban por false. Ahora
    // enviamos "true"/"false" directamente.
    table.column("mainBranch:name").search(nextFilters.mainBranch || "", false, false);
    table.draw();
  };

  const handleApply = () => {
    applyFiltersToTable(filters);
    onApply?.(filters);
    filterInstance?.current?.hide();
  };

  // QA Bloque AU — Bug 3c: Limpiar deja el modal abierto (mismo patron AQ).
  const handleClear = () => {
    setFilters(initialFilters);
    applyFiltersToTable(initialFilters);
    onApply?.(initialFilters);
  };

  return (
    <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Filtrar sucursales</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="CITY_FILTER"
                  label="Ciudad"
                  options={(municipalities || []).map((m) => ({ id: m.id, label: m.name }))}
                  value={filters.municipalityId}
                  onChange={(value) =>
                    setFilters({ ...filters, municipalityId: value || "" })
                  }
                  clearable
                  placeholder="Seleccione una ciudad"
                />
              </div>
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="MAIN_BRANCH_FILTER"
                  label="Sucursal principal"
                  options={MAIN_BRANCH_OPTIONS}
                  value={filters.mainBranch}
                  onChange={(value) => setFilters({ ...filters, mainBranch: value || "" })}
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

export default FilterBankBranch;
