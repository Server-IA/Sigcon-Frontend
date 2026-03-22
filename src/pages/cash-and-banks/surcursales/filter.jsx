import { useState } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { exactRegex } from "../../../utils/bankUtils";
import { sanitizeSimpleText } from "../../../utils/bankUtils";

const MAIN_BRANCH_OPTIONS = [
  { id: "", label: "Todas" },
  { id: "true", label: "Principal" },
  { id: "false", label: "Secundaria" },
];

const initialFilters = {
  city: "",
  mainBranch: "",
};

const FilterBankBranch = ({ filterRef, filterInstance, dataTableRef, onApply }) => {
  const [filters, setFilters] = useState(initialFilters);

  const applyFiltersToTable = (nextFilters) => {
    const table = dataTableRef?.current;
    if (!table) return;

    table.column("city:name").search(nextFilters.city || "", false, true);
    table.column("mainBranch:name").search(exactRegex(nextFilters.mainBranch), true, false);
    table.draw();
  };

  const handleApply = () => {
    applyFiltersToTable(filters);
    onApply?.(filters);
    filterInstance?.current?.hide();
  };

  const handleClear = () => {
    setFilters(initialFilters);
    applyFiltersToTable(initialFilters);
    onApply?.(initialFilters);
    filterInstance?.current?.hide();
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
                <InputModal
                  type="text"
                  id="CITY_FILTER"
                  label="Ciudad"
                  value={filters.city}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      city: sanitizeSimpleText(e.target.value, 100),
                    })
                  }
                  placeholder="Ciudad"
                />
              </div>
              <div className="col-12 mb-3">
                <InputSelectModal
                  id="MAIN_BRANCH_FILTER"
                  label="Sucursal principal"
                  options={MAIN_BRANCH_OPTIONS}
                  value={filters.mainBranch}
                  onChange={(value) => setFilters({ ...filters, mainBranch: value })}
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
