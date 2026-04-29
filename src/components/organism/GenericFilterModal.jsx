import { useState } from 'react';
import InputModal from '../molecules/InputModal';
import InputSelectModal from '../molecules/inputSelectModal';

/**
 * Modal de filtrado reutilizable para cualquier listado basado en DataTableReference.
 *
 * Uso tipico (en un index.jsx que ya tiene dataTableRef y buttons):
 *
 *   const filterRef = useRef(null);
 *   const filterInstance = useRef(null);
 *
 *   const filterColumns = [
 *     { column: 'code:name', label: 'Codigo' },
 *     { column: 'name:name', label: 'Nombre' },
 *     { column: 'status:name', label: 'Estado', type: 'select', options: [{id:'ACTIVE', label:'Activo'}, ...] },
 *     { column: 'amount:name', label: 'Monto', type: 'number' },
 *     { column: 'date:name', label: 'Fecha', type: 'date' },
 *   ];
 *
 *   // en `buttons`:
 *   {
 *     text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
 *     className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
 *     action: () => {
 *       if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
 *       filterInstance.current.show();
 *     }
 *   }
 *
 *   // al final del return:
 *   <GenericFilterModal
 *     filterRef={filterRef}
 *     filterInstance={filterInstance}
 *     dataTableRef={dataTableRef}
 *     title="Filtrar Tasas de Cambio"
 *     columns={filterColumns}
 *   />
 *
 * Para que los filtros por columna funcionen el atributo `name` de la columna del
 * DataTable debe coincidir con el nombre usado aqui (ej. `{ title: 'Codigo', data:
 * 'code', name: 'code' }`).
 *
 * @param {object} props
 * @param {React.RefObject} props.filterRef       ref al div.modal
 * @param {React.RefObject} props.filterInstance  ref al bootstrap.Modal instance
 * @param {React.RefObject} props.dataTableRef    ref al datatable API
 * @param {string} [props.title]                  titulo del modal (default "Filtrar")
 * @param {Array<{column:string,label:string,type?:string,options?:Array,placeholder?:string}>} props.columns
 */
const GenericFilterModal = ({ filterRef, filterInstance, dataTableRef, title = 'Filtrar', columns = [] }) => {

    const getTable = () => dataTableRef?.current?.table();

    const buildInitialState = () => columns.map(c => ({
        column: c.column,
        value: '',
        regex: true,
    }));

    const [filters, setFilters] = useState(buildInitialState());

    const getFilter = (col) => filters.find(f => f.column === col);

    const updateFilter = (col, key, value) => {
        setFilters(prev => prev.map(f => f.column === col ? { ...f, [key]: value } : f));
    };

    const applyFilters = () => {
        const table = getTable();
        if (!table) {
            filterInstance?.current?.hide();
            return;
        }
        // QA-BLOQUE-AO (2026-04-29): normalizar el selector a `<colName>:name`.
        // Antes muchas paginas usaban formato `<col>:<col>` (ej. `status:status`)
        // que jQuery interpretaba como pseudo selector NO REGISTRADO -> excepcion
        // silenciosa por el try/catch -> filter nunca se aplicaba. Solo `:name`
        // literal es el pseudo valido de DataTables para matchear column.name.
        filters.forEach(f => {
            try {
                const colName = String(f.column).split(':')[0];
                table.column(colName + ':name').search(f.value || '', !!f.regex, false);
            } catch (e) {
                // columna no existe en el DataTable (ej. cambia dinamicamente)
            }
        });
        table.draw();
        filterInstance?.current?.hide();
    };

    const clearFilters = () => {
        const table = getTable();
        if (table) {
            table.columns().search('');
            table.search('');
            table.draw();
        }
        setFilters(buildInitialState());
        filterInstance?.current?.hide();
    };

    const renderInput = (col) => {
        const current = getFilter(col.column);
        if (!current) return null;

        const commonId = `generic_filter_${col.column.replace(/[:.]/g, '_')}`;
        const placeholder = col.placeholder ?? `Buscar por ${col.label?.toLowerCase() ?? ''}`;

        if (col.type === 'select') {
            const value = current.value === '' ? [] : String(current.value).split(',').filter(v => v !== '');
            return (
                <InputSelectModal
                    id={commonId}
                    label={col.label}
                    options={col.options ?? []}
                    value={value}
                    onChange={(v) => {
                        const joined = Array.isArray(v) ? v.join(',') : String(v ?? '');
                        updateFilter(col.column, 'value', joined);
                    }}
                    multiple={col.multiple ?? true}
                    placeholder={placeholder}
                />
            );
        }

        return (
            <InputModal
                type={col.type ?? 'text'}
                id={commonId}
                label={col.label}
                value={current.value}
                onChange={(e) => updateFilter(col.column, 'value', e?.target?.value ?? e)}
                placeholder={placeholder}
                error=""
            />
        );
    };

    return (
        <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{title}</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            {columns.map((col) => (
                                <div className="col-md-6 mb-4 mt-2" key={col.column}>
                                    <div className="input-group">
                                        {/* Checkbox regex: busqueda por coincidencia parcial o exacta.
                                            Solo aplica a inputs de texto; los selects ya son coincidencia exacta. */}
                                        {col.type !== 'select' && (
                                            <div className="input-group-text form-check mb-0">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input m-auto"
                                                    checked={getFilter(col.column)?.regex ?? true}
                                                    onChange={(e) => updateFilter(col.column, 'regex', e.target.checked)}
                                                    disabled={!dataTableRef?.current}
                                                    data-bs-toggle="tooltip"
                                                    data-bs-placement="top"
                                                    data-bs-original-title="Busqueda por coincidencia"
                                                    aria-label="Buscar por coincidencia"
                                                />
                                            </div>
                                        )}
                                        {renderInput(col)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={applyFilters}>
                            Filtrar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={clearFilters}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenericFilterModal;
