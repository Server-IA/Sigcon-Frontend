import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

// HU-ACT-10: filtro de activos.
// Acepta `thirds` (lista del index, label="codigo - razon social") como
// fuente de proveedores. Antes el index pasaba `thirds` pero este componente
// declaraba `suppliers`, asi que el dropdown salia vacio siempre.
const FilterAssets = ({
  filterRef,
  filterInstance,
  dataTableRef,
  classifications = [],
  types = [],
  suppliers = [],
  thirds = [],
  statuses = [],
}) => {
  const supplierOptions = (suppliers && suppliers.length ? suppliers : thirds) || [];
  const getTable = () => {
    return dataTableRef?.current?.table();
  };
  const [filters, setFilters] = useState([
    // QA-BLOQUE-AY (2026-05-05): el sufijo ':name' es el pseudo-selector de
    // DataTables que matchea por column.name. La columna del DataTable debe
    // declarar el path JPA real de la entidad (assetName / assetType).
    { regex: true,  value: "", column: "assetName:name" },
    { regex: true,  value: "", column: "classification:name" },
    { regex: true,  value: "", column: "assetType:name" },
    { regex: false, value: "", column: "supplier.id:name" },
    { regex: true,  value: "", column: "status:name" },
    { regex: false, value: "", column: "acquisitionDate:name" },
  ]);

  const getFilter = (column) => {
    return filters.find((f) => f.column === column);
  };

  const updateFilter = (column, field, value) => {
    setFilters((prev) =>
      prev.map((filter) =>
        filter.column === column ? { ...filter, [field]: value } : filter,
      ),
    );
  };

  useEffect(() => {
    const table = getTable();
    if (!table) return;

    filters.forEach((filter) => {
      // QA-2026-05-05: defensivo - si la columna no existe en el DataTable
      // (ej. por un name selector que el motor de jQuery no resuelve),
      // omitir en lugar de romper el render del componente.
      try {
        const col = table.column(filter.column);
        if (col && col.length) {
          col.search(filter.value || '', filter.regex, false);
        }
      } catch (_) { /* column not found - ignore */ }
    });
  }, [filters]);

  const applyFilters = () => {
    const table = getTable();
    if (!table) return;

    table.draw();
    filterInstance?.current?.hide();
  };

  const clearFilters = () => {
    const table = getTable();
    if (!table) return;

    table.columns().search("");
    table.search("");
    table.draw();

    setFilters([
      { regex: true,  value: "", column: "assetName:name" },
      { regex: true,  value: "", column: "classification:name" },
      { regex: true,  value: "", column: "assetType:name" },
      { regex: false, value: "", column: "supplier.id:name" },
      { regex: true,  value: "", column: "status:name" },
      { regex: false, value: "", column: "acquisitionDate:name" },
    ]);

    filterInstance?.current?.hide();
  };

  return (
    <>
      <div
        className="modal fade"
        ref={filterRef}
        id="filterAssetsModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Filtrar activos</h4>
              <button className="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div className="modal-body">
              <div className="row">
                {/* NAME */}

                <div className="col mb-4">
                  <div className="input-group">
                    <div className="input-group-text form-check mb-0">
                      <input
                        type="checkbox"
                        className="form-check-input m-auto"
                        checked={getFilter("assetName:name")?.regex}
                        onChange={(e) =>
                          updateFilter("assetName:name", "regex", e.target.checked)
                        }
                      />
                    </div>

                    <InputModal
                      type="text"
                      id="name_filter"
                      label="Nombre del activo"
                      placeholder="Buscar activo"
                      value={getFilter("assetName:name")?.value || ""}
                      onChange={(e) =>
                        updateFilter("assetName:name", "value", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* CLASSIFICATION */}

                <div className="col mb-4">
                  <InputSelectModal
                    id="classification_filter"
                    label="Clasificación"
                    options={[
                      { id: "NON_CURRENT", label: "Activo no corriente" },
                      { id: "CURRENT", label: "Activo corriente" },
                    ]}
                    value={
                      (getFilter("classification:name")?.value || "") === ""
                        ? []
                        : (getFilter("classification:name")?.value || "").split("|")
                    }
                    onChange={(value) =>
                      updateFilter(
                        "classification:name",
                        "value",
                        value.join("|"),
                      )
                    }
                    multiple
                  />
                </div>
              </div>

              <div className="row">
                {/* TYPE */}

                <div className="col mb-4">
                  <InputSelectModal
                    id="type_filter"
                    label="Tipo"
                    options={[
                      { id: "TANGIBLE", label: "Tangible" },
                      { id: "INTANGIBLE", label: "Intangible" },
                    ]}
                    value={
                      (getFilter("assetType:name")?.value || "") === ""
                        ? []
                        : (getFilter("assetType:name")?.value || "").split("|")
                    }
                    onChange={(value) =>
                      updateFilter("assetType:name", "value", value.join("|"))
                    }
                    multiple
                  />
                </div>

                {/* SUPPLIER */}

                <div className="col mb-4">
                  <InputSelectModal
                    id="supplier_filter"
                    label="Proveedor"
                    options={supplierOptions.map((s) => ({
                      id: s.id,
                      label: s.label || s.name || `Proveedor ${s.id}`,
                    }))}
                    value={
                      (getFilter("supplier.id:name")?.value || "") === ""
                        ? []
                        : (getFilter("supplier.id:name")?.value || "").split("|")
                    }
                    onChange={(value) =>
                      updateFilter("supplier.id:name", "value", value.join("|"))
                    }
                    multiple
                    emptyMessage="No hay proveedores registrados. Cree uno en Terceros con rol PROVEEDOR."
                  />
                </div>
              </div>

              <div className="row">
                {/* STATUS */}

                <div className="col mb-4">
                  <InputSelectModal
                    id="status_filter"
                    label="Estado"
                    options={statuses.map((s) => ({
                      label: s.name,
                      id: s.id || s.name,
                    }))}
                    value={
                      (getFilter("status:name")?.value || "") === ""
                        ? []
                        : (getFilter("status:name")?.value || "").split("|")
                    }
                    onChange={(value) =>
                      updateFilter("status:name", "value", value.join("|"))
                    }
                    multiple
                  />
                </div>

                {/* ACQUISITION DATE - HU-ACT-10 E2 */}
                <div className="col mb-4">
                  <InputModal
                    type="date"
                    id="acquisition_date_filter"
                    label="Fecha de adquisicion"
                    value={getFilter("acquisitionDate:name")?.value || ""}
                    onChange={(e) =>
                      updateFilter("acquisitionDate:name", "value", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={applyFilters}>
                Filtrar
              </button>

              <button className="btn btn-danger" onClick={clearFilters}>
                Limpiar
              </button>

              <button
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterAssets;
