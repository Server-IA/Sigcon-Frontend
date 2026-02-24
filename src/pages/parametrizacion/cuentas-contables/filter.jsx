import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterCuentaContable = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => {
        return dataTableRef?.current?.table();
    };

    const [filters, setFilters] = useState([
        {
            regex: true,
            value: '',
            column: 'customName:name',
        },
        {
            regex: true,
            value: '',
            column: 'pucCode:name',
        },
        {
            regex: true,
            value: '',
            column: 'baseCurrency:name',
        },
        {
            regex: true,
            value: '',
            column: 'costCenterName:name',
        },
        {
            regex: true,
            value: '',
            column: 'depreciationRuleName:name',
        },
        {
            regex: true,
            value: '',
            column: 'nature:name',
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
    }, [filters]);

    const handleFilter = () => {
        if (!dataTableRef?.current) return;
        dataTableRef.current.table().draw();
        filterInstance.current.hide();
    }

    const handleReset = () => {
        if (!dataTableRef?.current) return;
        setFilters(filters.map(f => ({ ...f, value: '' })));
        dataTableRef.current.table().columns().search('');
        dataTableRef.current.table().draw();
        filterInstance.current.hide();
    }

    return (
        <div className="modal fade" ref={filterRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Filtrar Cuentas Contables</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">    
                        {/* Nombre Personalizado */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'customName:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'customName:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="customName_filter"
                                        label="Nombre Personalizado"
                                        value={filters.find(filter => filter.column === 'customName:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'customName:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Ej: Caja general"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Código PUC */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'pucCode:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'pucCode:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="pucCode_filter"
                                        label="Código PUC"
                                        value={filters.find(filter => filter.column === 'pucCode:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'pucCode:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Ej: 110505"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Moneda Base */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'baseCurrency:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'baseCurrency:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="baseCurrency_filter"
                                        label="Moneda Base"
                                        value={filters.find(filter => filter.column === 'baseCurrency:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'baseCurrency:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Ej: USD, COP"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Centro de Costos */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'costCenterName:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'costCenterName:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="costCenterName_filter"
                                        label="Centro de Costos"
                                        value={filters.find(filter => filter.column === 'costCenterName:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'costCenterName:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Nombre del centro"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Regla de Depreciación */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'depreciationRuleName:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'depreciationRuleName:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="depreciationRuleName_filter"
                                        label="Regla de Depreciación"
                                        value={filters.find(filter => filter.column === 'depreciationRuleName:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'depreciationRuleName:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Nombre de la regla"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Naturaleza */}
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="nature_filter"
                                    label="Naturaleza"
                                    value={filters.find(filter => filter.column === 'nature:name')?.value || ""}
                                    onChange={(value) => {
                                        setFilters(prev => prev.map(filter => filter.column === 'nature:name' ? {
                                            ...filter,
                                            value: value,
                                        } : filter));
                                    }}
                                    error=""
                                    placeholder="Seleccionar naturaleza"
                                    options={[
                                        { id: 'DEUDORA', label: 'Deudora' },
                                        { id: 'ACREEDORA', label: 'Acreedora' }
                                    ]}
                                    clearable={true}
                                />
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="status_filter"
                                    label="Estado"
                                    value={filters.find(filter => filter.column === 'status:name')?.value || ""}
                                    onChange={(value) => {
                                        setFilters(prev => prev.map(filter => filter.column === 'status:name' ? {
                                            ...filter,
                                            value: value,
                                        } : filter));
                                    }}
                                    error=""
                                    placeholder="Seleccionar estado"
                                    options={[
                                        { id: 'ACTIVE', label: 'Activa' },
                                        { id: 'INACTIVE', label: 'Inactiva' }
                                    ]}
                                    clearable={true}
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
