import { useEffect, useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const FilterPUC = ({ filterRef, filterInstance, dataTableRef, accountClasses, hierarchyLevels, accountNatures, accountStatuses }) => {

    const getTable = () => dataTableRef?.current?.table();

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'code:name' },
        { regex: true, value: '', column: 'name:name' },
        { regex: true, value: '', column: 'accountClass:name' },
        { regex: true, value: '', column: 'level:name' },
        { regex: true, value: '', column: 'nature:name' },
        { regex: true, value: '', column: 'status:name' },
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
            <div className="modal fade" ref={filterRef} id="modalFilterPUC" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="modalFilterPUCTitle">Filtrar Catálogo PUC</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body">

                            {/* Código + Nombre */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('code:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('code:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="puc_filter_code"
                                            label="Código"
                                            value={getFilter('code:name')?.value || ''}
                                            onChange={(e) => updateFilter('code:name', 'value', e.target.value)}
                                            placeholder="Buscar por código"
                                            error=""
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 mb-4 mt-2">
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
                                            id="puc_filter_name"
                                            label="Nombre de la cuenta"
                                            value={getFilter('name:name')?.value || ''}
                                            onChange={(e) => updateFilter('name:name', 'value', e.target.value)}
                                            placeholder="Buscar por nombre"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clase */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('accountClass:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('accountClass:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="puc_filter_accountClass"
                                            label="Clase de la cuenta"
                                            options={accountClasses}
                                            value={selectValue('accountClass:name')}
                                            onChange={(value) => updateFilter('accountClass:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nivel jerárquico + Naturaleza */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('level:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('level:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="puc_filter_hierarchyLevel"
                                            label="Nivel jerárquico"
                                            options={hierarchyLevels}
                                            value={selectValue('level:name')}
                                            onChange={(value) => updateFilter('level:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('nature:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('nature:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="puc_filter_nature"
                                            label="Naturaleza"
                                            options={accountNatures}
                                            value={selectValue('nature:name')}
                                            onChange={(value) => updateFilter('nature:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="row">
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
                                            id="puc_filter_status"
                                            label="Estado de la cuenta"
                                            options={accountStatuses}
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

export default FilterPUC;
