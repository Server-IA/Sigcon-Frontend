import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterMenu = ({ filterRef, filterInstance, dataTableRef, modules, parents, components }) => {

    const getTable = () => {
        return dataTableRef?.current?.table();
    };

    const [filters, setFilters] = useState([
        {
            regex: true,
            value: '',
            column: 'label:name',
        },
        {
            regex: true,
            value: '',
            column: 'path:name',
        },
        {
            regex: true,
            value: '',
            column: 'component:name',
        },
        {
            regex: true,
            value: '',
            column: 'module:name',
        },
        {
            regex: true,
            value: '',
            column: 'parent:name',
        }
    ]);
    
    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(filter => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
        console.log(filters, 'filters');
    }, [filters]);

    return (
        <>
            <div className="modal fade" ref={filterRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="modalCenterTitle">Filtrar menús</h4>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={filters.find(filter => filter.column === 'label:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'label:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="label_filter"
                                            label="Nombre del menu"
                                            value={filters.find(filter => filter.column === 'label:name')?.value || ""}
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'label:name' ? {
                                                    ...filter,
                                                    value: e.target.value,
                                                } : filter));
                                            }}
                                            placeholder="Buscar por nombre"
                                            error=""
                                        />
                                    </div>
                                </div>
                                <div className="col mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={filters.find(filter => filter.column === 'path:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'path:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="path_filter"
                                            label="URL del menu"
                                            value={filters.find(filter => filter.column === 'path:name')?.value || ""}
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'path:name' ? {
                                                    ...filter,
                                                    value: e.target.value,
                                                } : filter));
                                            }}
                                            placeholder="Buscar por URL"
                                            error=""
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={filters.find(filter => filter.column === 'component:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'component:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>

                                        <InputSelectModal
                                            id="component_filter"
                                            label="Componente del menu"
                                            options={components.map(component => ({
                                                name: component.name,
                                                id: component.id,
                                            }))}
                                            value={filters.find(filter => filter.column === 'component:name')?.value === '' ? [] : filters.find(filter => filter.column === 'component:name')?.value.split(',')}
                                            onChange={(value) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'component:name' ? {
                                                    ...filter,
                                                    value: value.join(','),
                                                } : filter));
                                            }}
                                            multiple={true}
                                        />
                                    </div>

                                </div>

                                <div className="col mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={filters.find(filter => filter.column === 'module:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'module:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>

                                        <InputSelectModal
                                            id="module_filter"
                                            label="Módulo del menu"
                                            options={modules.map(module => ({
                                                name: module.name,
                                                id: module.name,
                                            }))}
                                            value={filters.find(filter => filter.column === 'module:name')?.value === '' ? [] : filters.find(filter => filter.column === 'module:name')?.value.split(',')}
                                            onChange={(value) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'module:name' ? {
                                                    ...filter,
                                                    value: value.join(','),
                                                } : filter));
                                            }}
                                            multiple={true}
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={filters.find(filter => filter.column === 'parent:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'parent:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>

                                        <InputSelectModal
                                            id="parent_filter"
                                            label="Padre del menu"
                                            options={parents.map(parent => ({
                                                name: parent.name,
                                                id: parent.name,
                                            }))}
                                            value={filters.find(filter => filter.column === 'parent:name')?.value === '' ? [] : filters.find(filter => filter.column === 'parent:name')?.value.split(',')}
                                            onChange={(value) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'parent:name' ? {
                                                    ...filter,
                                                    value: value.join(','),
                                                } : filter));
                                            }}
                                            multiple={true}
                                        />
                                    </div>

                                </div>
                            </div>
                        </div>
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
}

export default FilterMenu;