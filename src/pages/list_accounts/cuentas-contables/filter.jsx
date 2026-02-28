import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

// AccountFilterRequest fields — filters are applied server-side via POST /api/v1/accounting-accounts
// Fields: custom_name, base_currency, puc_id, cost_center_id, depreciation_rule_id, nature, status

const NATURE_OPTIONS = [
    { id: 'DEBIT',  label: 'Deudora' },
    { id: 'CREDIT', label: 'Acreedora' },
];

const STATUS_OPTIONS = [
    { id: 'ACTIVE',   label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
];

const FilterCuentaContable = ({
    filterRef,
    filterInstance,
    dataTableRef,
    activeFilters,
    setActiveFilters,
    initialFilters,
}) => {

    const handleFilter = () => {
        // activeFilters already updated via setActiveFilters on each onChange;
        // just reload the DataTable (requestWrapper in index.jsx picks up the latest ref)
        dataTableRef?.current?.ajax.reload();
        filterInstance?.current?.hide();
    };

    const handleReset = () => {
        setActiveFilters(initialFilters);
        // Slight delay so requestWrapperRef syncs before reload
        setTimeout(() => {
            dataTableRef?.current?.ajax.reload();
        }, 0);
        filterInstance?.current?.hide();
    };

    return (
        <div className="modal fade" ref={filterRef} id="filterCuentasContables" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="filterCuentasContablesTitle">Filtrar Cuentas Contables</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>
                    <div className="modal-body">

                        {/* Nombre Personalizado — AccountFilterRequest.custom_name */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <InputModal
                                    type="text"
                                    id="filter_custom_name"
                                    label="Nombre Personalizado"
                                    value={activeFilters.custom_name}
                                    onChange={(e) => setActiveFilters(prev => ({ ...prev, custom_name: e.target.value }))}
                                    placeholder="Ej: Caja general"
                                    error=""
                                />
                            </div>
                        </div>

                        {/* Moneda Base — AccountFilterRequest.base_currency */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <InputModal
                                    type="text"
                                    id="filter_base_currency"
                                    label="Moneda Base"
                                    value={activeFilters.base_currency}
                                    onChange={(e) => setActiveFilters(prev => ({ ...prev, base_currency: e.target.value }))}
                                    placeholder="Ej: USD, COP"
                                    error=""
                                />
                            </div>
                        </div>

                        {/* Naturaleza — AccountFilterRequest.nature */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <InputSelectModal
                                    id="filter_nature"
                                    label="Naturaleza"
                                    value={activeFilters.nature}
                                    onChange={(value) => setActiveFilters(prev => ({ ...prev, nature: value }))}
                                    placeholder="Seleccionar naturaleza"
                                    options={NATURE_OPTIONS}
                                    clearable={true}
                                    error=""
                                />
                            </div>
                        </div>

                        {/* Estado — AccountFilterRequest.status */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <InputSelectModal
                                    id="filter_status"
                                    label="Estado"
                                    value={activeFilters.status}
                                    onChange={(value) => setActiveFilters(prev => ({ ...prev, status: value }))}
                                    placeholder="Seleccionar estado"
                                    options={STATUS_OPTIONS}
                                    clearable={true}
                                    error=""
                                />
                            </div>
                        </div>

                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleReset}>
                            Limpiar Filtros
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleFilter}>
                            Buscar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterCuentaContable;
