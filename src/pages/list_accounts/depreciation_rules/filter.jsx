import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

// ─── Constantes ────────────────────────────────────────────────────────────────
const DEPRECIATION_TYPES = [
    { id: 'LINEAR', name: 'Lineal' },
    { id: 'DECLINING_BALANCE', name: 'Decreciente' },
    { id: 'ACCELERATED', name: 'Acelerada' },
    { id: 'PRODUCTION_UNITS', name: 'Unidades de producción' },
    { id: 'MINIMUM_USEFUL_LIFE', name: 'Vida útil mínima' },
];

const RULE_STATUSES = [
    { id: 'ACTIVE', name: 'Activa' },
    { id: 'INACTIVE', name: 'Inactiva' },
];

// ─── Componente ─────────────────────────────────────────────────────────────────
const FilterDepreciationRule = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => dataTableRef?.current?.table();

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'name:name' },
        { regex: true, value: '', column: 'depreciationType:name' },
        { regex: true, value: '', column: 'accountName:name' },
        { regex: true, value: '', column: 'status:name' },
        { regex: false, value: '', column: 'effectiveDate:name' },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(filter => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
    }, [filters]);

    const getFilter = (column) => filters.find(f => f.column === column);

    const updateFilter = (column, key, value) => {
        setFilters(prev => prev.map(f =>
            f.column === column ? { ...f, [key]: value } : f
        ));
    };

    const selectValue = (column) => {
        const val = getFilter(column)?.value;
        return val === '' ? [] : val.split(',');
    };

    return (
        <>
            <div className="modal fade" ref={filterRef} id="modalFilterDepreciationRule" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Filtrar Reglas de Depreciación</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body">

                            {/* Nombre */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('name:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('name:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="dr_filter_name"
                                            label="Nombre de la regla"
                                            value={getFilter('name:name')?.value || ''}
                                            onChange={(e) => updateFilter('name:name', 'value', e.target.value)}
                                            placeholder="Buscar por nombre"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tipo de depreciación */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('depreciationType:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('depreciationType:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="dr_filter_depreciationType"
                                            label="Tipo de depreciación"
                                            options={DEPRECIATION_TYPES}
                                            value={selectValue('depreciationType:name')}
                                            onChange={(value) => updateFilter('depreciationType:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cuenta contable */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('accountName:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('accountName:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="dr_filter_accountName"
                                            label="Cuenta contable"
                                            value={getFilter('accountName:name')?.value || ''}
                                            onChange={(e) => updateFilter('accountName:name', 'value', e.target.value)}
                                            placeholder="Buscar por cuenta contable"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fecha de vigencia + Estado */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <InputModal
                                            type="date"
                                            id="dr_filter_effectiveDate"
                                            label="Fecha de vigencia"
                                            value={getFilter('effectiveDate:name')?.value || ''}
                                            onChange={(e) => updateFilter('effectiveDate:name', 'value', e.target.value)}
                                            placeholder="DD/MM/AAAA"
                                            error=""
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('status:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('status:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="dr_filter_status"
                                            label="Estado de la regla"
                                            options={RULE_STATUSES}
                                            value={selectValue('status:name')}
                                            onChange={(value) => updateFilter('status:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>{/* /modal-body */}

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    getTable().draw();
                                    filterInstance?.current?.hide();
                                }}
                            >
                                Filtrar
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => {
                                    getTable().columns().search('');
                                    getTable().search('');
                                    getTable().draw();
                                    setFilters(prev => prev.map(f => ({ ...f, value: '' })));
                                    filterInstance?.current?.hide();
                                }}
                            >
                                Limpiar
                            </button>
                            <button
                                type="button"
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

export default FilterDepreciationRule;
