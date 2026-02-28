import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const ACCOUNT_CLASS_OPTIONS = [
    { id: 'ASSET', label: 'Activo' },
    { id: 'LIABILITY', label: 'Pasivo' },
    { id: 'EQUITY', label: 'Patrimonio' },
    { id: 'REVENUE', label: 'Ingresos' },
    { id: 'EXPENSE', label: 'Gastos' },
    { id: 'COST_OF_SALES', label: 'Costos de venta' },
    { id: 'PRODUCTION_COST', label: 'Costos de producción' },
    { id: 'MEMORANDUM_DEBIT', label: 'Cuentas de orden deudoras' },
    { id: 'MEMORANDUM_CREDIT', label: 'Cuentas de orden acreedoras' },
];

const ACCOUNT_LEVEL_OPTIONS = [
    { id: 'CLASS', label: 'Clase' },
    { id: 'GROUP', label: 'Grupo' },
    { id: 'ACCOUNT', label: 'Cuenta' },
    { id: 'SUBACCOUNT', label: 'Subcuenta' },
];

const FilterCuentaContable = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => {
        return dataTableRef?.current?.table();
    };

    const [filters, setFilters] = useState([
        {
            regex: true,
            value: '',
            column: 'code:name',
        },
        {
            regex: true,
            value: '',
            column: 'name:name',
        },
        {
            regex: true,
            value: '',
            column: 'accountClass:name',
        },
        {
            regex: true,
            value: '',
            column: 'level:name',
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
                        {/* Código de la Cuenta */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'code:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters(prev => prev.map(filter => filter.column === 'code:name' ? {
                                                    ...filter,
                                                    regex: e.target.checked,
                                                } : filter));
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar" />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="code_filter"
                                        label="Código"
                                        value={filters.find(filter => filter.column === 'code:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'code:name' ? {
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

                        {/* Nombre de la Cuenta */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find(filter => filter.column === 'name:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
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
                                        label="Nombre"
                                        value={filters.find(filter => filter.column === 'name:name')?.value || ""}
                                        onChange={(e) => {
                                            setFilters(prev => prev.map(filter => filter.column === 'name:name' ? {
                                                ...filter,
                                                value: e.target.value,
                                            } : filter));
                                        }}
                                        placeholder="Ej: Caja General"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Clase Contable */}
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="accountClass_filter"
                                    label="Clase Contable"
                                    value={filters.find(filter => filter.column === 'accountClass:name')?.value || ""}
                                    onChange={(value) => {
                                        setFilters(prev => prev.map(filter => filter.column === 'accountClass:name' ? {
                                            ...filter,
                                            value: value,
                                        } : filter));
                                    }}
                                    error=""
                                    placeholder="Seleccionar clase"
                                    options={ACCOUNT_CLASS_OPTIONS}
                                    clearable={true}
                                />
                            </div>
                        </div>

                        {/* Nivel Jerárquico */}
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="level_filter"
                                    label="Nivel Jerárquico"
                                    value={filters.find(filter => filter.column === 'level:name')?.value || ""}
                                    onChange={(value) => {
                                        setFilters(prev => prev.map(filter => filter.column === 'level:name' ? {
                                            ...filter,
                                            value: value,
                                        } : filter));
                                    }}
                                    error=""
                                    placeholder="Seleccionar nivel"
                                    options={ACCOUNT_LEVEL_OPTIONS}
                                    clearable={true}
                                />
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
                                        { id: 'DEBIT', label: 'Deudora' },
                                        { id: 'CREDIT', label: 'Acreedora' }
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
