import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterRole = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => {
        return dataTableRef?.current?.table();
    };

    // QA Bloque PA Bug 3 (HU-PA-03 E2, 2026-05-09): agregar filtro por Tipo
    // (Predefinido / Personalizado). El backend resuelve `type` en el name de
    // la columna del DataTableRequest (ver RoleService.extractTypeFilter).
    const [filters, setFilters] = useState([
        {
            regex: true,
            value: '',
            column: 'name:name',
        },
        {
            regex: true,
            value: '',
            column: 'status:name',
        },
        {
            regex: false,
            value: '',
            column: 'type:name',
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

    return (
        <>
            <div className="modal fade" ref={filterRef} id="modalCenterRoles" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="modalCenterRolesTitle">Filtrar roles</h4>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
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
                                            label="Nombre del rol"
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

                                <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
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
                                            label="Estado del rol"
                                            options={[
                                                { name: 'Activo', id: 'ACTIVE' },
                                                { name: 'Inactivo', id: 'INACTIVE' },
                                            ]}
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

                                {/* QA Bloque PA Bug 3 (HU-PA-03 E2): filtro por Tipo */}
                                <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                checked={true}
                                                disabled
                                                aria-label="Filtro tipo" />
                                        </div>
                                        <InputSelectModal
                                            id="type_filter"
                                            label="Tipo de rol"
                                            options={[
                                                { name: 'Predefinido', id: 'PREDEFINED' },
                                                { name: 'Personalizado', id: 'CUSTOM' },
                                            ]}
                                            value={filters.find(f => f.column === 'type:name')?.value || ''}
                                            onChange={(value) => {
                                                // QA Bloque PA Bug 74 (HU-PA-03 E2, 2026-05-11):
                                                // InputSelectModal con multiple=false retorna STRING
                                                // (no array). Antes hacia Array.isArray(value) &&
                                                // value[0], asi que el filtro NUNCA se aplicaba y
                                                // la opcion seleccionada se reseteaba a "" en cada
                                                // cambio. Ahora trabajamos con string directo.
                                                const v = Array.isArray(value)
                                                    ? (value.length > 0 ? value[0] : '')
                                                    : (value || '');
                                                setFilters(prev => prev.map(filter => filter.column === 'type:name' ? {
                                                    ...filter,
                                                    value: v,
                                                } : filter));
                                            }}
                                            multiple={false}
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

export default FilterRole;
