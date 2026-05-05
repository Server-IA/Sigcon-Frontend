import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

// ─── Constantes ────────────────────────────────────────────────────────────────
// Valores deben coincidir con los del catálogo en BD (español)
const THIRD_PARTY_STATUSES = [
    { id: 'ACTIVO', name: 'Activo' },
    { id: 'INACTIVO', name: 'Inactivo' },
    { id: 'BLOQUEADO', name: 'Bloqueado' },
];

const THIRD_PARTY_ROLES = [
    { id: 'CLIENTE', name: 'Cliente' },
    { id: 'PROVEEDOR', name: 'Proveedor' },
    { id: 'EMPLEADO', name: 'Empleado' },
    { id: 'ACREEDOR', name: 'Acreedor' },
    { id: 'DEUDOR', name: 'Deudor' },
];

const PERSON_TYPES = [
    { id: 'NATURAL', name: 'Natural' },
    { id: 'JURIDICA', name: 'Jurídica' },
];

// ─── Componente ─────────────────────────────────────────────────────────────────
const FilterThirdParty = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => dataTableRef?.current?.table();

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'nit:name' },
        { regex: true, value: '', column: 'businessName:name' },
        { regex: true, value: '', column: 'personType:name' },
        { regex: true, value: '', column: 'roles:name' },
        { regex: true, value: '', column: 'status:name' },
        // HU-TER-01 DEF#1 (2026-04-27): filtros de localidad usando paths JPA
        // reales. El modelo Municipality solo tiene `name` (ciudad) y FK a
        // Country. NO existe campo Department en el modelo de datos. El
        // segundo filtro mapea a country.name (etiqueta "Pais") porque es lo
        // que el modelo realmente expone. Si se agrega columna `department`
        // a Municipality, cambiar el `column:` a `municipality.department:name`.
        { regex: true, value: '', column: 'municipality.name:name' },
        { regex: true, value: '', column: 'municipality.country.name:name' },
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
            <div className="modal fade" ref={filterRef} id="modalFilterThirdParty" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Filtrar Terceros</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body">

                            {/* NIT */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('nit:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('nit:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="tp_filter_nit"
                                            label="NIT"
                                            value={getFilter('nit:name')?.value || ''}
                                            onChange={(e) => updateFilter('nit:name', 'value', e.target.value)}
                                            placeholder="Buscar por NIT"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Razón social */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('businessName:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('businessName:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="tp_filter_businessName"
                                            label="Razón Social"
                                            value={getFilter('businessName:name')?.value || ''}
                                            onChange={(e) => updateFilter('businessName:name', 'value', e.target.value)}
                                            placeholder="Buscar por razón social"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tipo de persona + Estado */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('personType:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('personType:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="tp_filter_personType"
                                            label="Tipo de persona"
                                            options={PERSON_TYPES}
                                            value={selectValue('personType:name')}
                                            onChange={(value) => updateFilter('personType:name', 'value', value.join(','))}
                                            multiple={true}
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
                                            id="tp_filter_status"
                                            label="Estado"
                                            options={THIRD_PARTY_STATUSES}
                                            value={selectValue('status:name')}
                                            onChange={(value) => updateFilter('status:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Roles */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('roles:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('roles:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="tp_filter_roles"
                                            label="Rol"
                                            options={THIRD_PARTY_ROLES}
                                            value={selectValue('roles:name')}
                                            onChange={(value) => updateFilter('roles:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* HU-TER-01 DEF#1 (2026-04-27): filtros de localidad funcionales.
                                Ciudad usa path JPA `municipality.name` (existe en el modelo).
                                Pais usa `municipality.country.name`. NO hay campo Department
                                en Municipality; si se requiere literal "Departamento", agregar
                                columna a la entidad y cambiar el column path aqui. */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('municipality.name:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('municipality.name:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="tp_filter_city"
                                            label="Ciudad"
                                            value={getFilter('municipality.name:name')?.value || ''}
                                            onChange={(e) => updateFilter('municipality.name:name', 'value', e.target.value)}
                                            placeholder="Buscar por ciudad"
                                            error=""
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('municipality.country.name:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('municipality.country.name:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="tp_filter_country"
                                            label="País"
                                            value={getFilter('municipality.country.name:name')?.value || ''}
                                            onChange={(e) => updateFilter('municipality.country.name:name', 'value', e.target.value)}
                                            placeholder="Buscar por país"
                                            error=""
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

export default FilterThirdParty;
