import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterModule = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => {
        return dataTableRef?.current?.table();
    };

    const [filters, setFilters] = useState([
        {
            regex: true,
            value: '',
            column: 'name:name',
        },
        {
            regex: true,
            value: '',
            column: 'url:name',
        },
        {
            regex: true,
            value: '',
            column: 'status:name',
        },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(filter => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
        console.log(filters, 'filters');
    }, [filters]);

    const handleFilter = () => {
        if (!dataTableRef?.current) return;
        dataTableRef.current.table().draw();
        filterInstance.current.hide();
    }

    const handleReset = () => {
        if (!dataTableRef?.current) return;
        dataTableRef.current.table().columns().search('');
        dataTableRef.current.table().draw();
        filterInstance.current.hide();
    }

    return (
        <div className="modal fade" ref={filterRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Filtrar Módulos</h4>
                    </div>
                    <div className="modal-body">    
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'name:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Busqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'name:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="name_filter"
                                        label="Nombre del módulo"
                                        value={filters.find(filter => filter.column === 'name:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'name:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Buscar por nombre"
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
                                            checked={filters.find(filter => filter.column === 'url:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Busqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'url:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="url_filter"
                                        label="URL del módulo"
                                        value={filters.find(filter => filter.column === 'url:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'url:name' ? {
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
                                                checked={filters.find(filter => filter.column === 'status:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Busqueda por coincidencia"
                                                type="checkbox"
                                                onChange={(e) => {
                                                    setFilters(prev => prev.map(filter => filter.column === 'status:name' ? {
                                                        ...filter,
                                                        regex: e.target.checked,
                                                    } : filter));
                                                }}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar" />
                                        </div>

                                        <InputSelectModal
                                            id="status_filter"
                                            label="Estado del módulo"
                                            options={[{id: 'ACTIVE', name: 'Activo'}, {id: 'INACTIVE', name: 'Inactivo'}]}
                                            value={filters.find(filter => filter.column === 'status:name')?.value === '' ? [] : filters.find(filter => filter.column === 'status:name')?.value.split(',')}
                                            onChange={(value) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'status:name' ? {
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
                        <button type="button" className="btn btn-primary" onClick={handleFilter}>Filtrar</button>
                        <button type="button" className="btn btn-danger" onClick={handleReset}>Limpiar</button>
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FilterModule;