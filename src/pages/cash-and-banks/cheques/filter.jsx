import { useEffect, useState } from 'react';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const FilterCheque = ({ filterRef, filterInstance, dataTableRef, estados, tipos }) => {

    const getTable = () => dataTableRef?.current?.table();

    const [filters, setFilters] = useState([
        { regex: true,  value: '', column: 'numeroCheque:name' },
        { regex: true,  value: '', column: 'beneficiario:name' },
        { regex: true,  value: '', column: 'concepto:name' },
        { regex: true,  value: '', column: 'estadoCheque:name' },
        { regex: true,  value: '', column: 'tipoCheque:name' },
        { regex: false, value: '', column: 'fechaExpedicion:name' },
        { regex: false, value: '', column: 'fechaExpedicion_hasta:name' },
        { regex: false, value: '', column: 'valorCheque:name' },
        { regex: false, value: '', column: 'valorCheque_hasta:name' },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(f => {
            // Columnas de rango (_hasta) no se aplican directamente como column search
            if (f.column.includes('_hasta')) return;
            table.column(f.column).search(f.value, f.regex, false);
        });
    }, [filters]);

    const getFilter   = (col)       => filters.find(f => f.column === col);
    const updateFilter = (col, key, val) => {
        setFilters(prev => prev.map(f => f.column === col ? { ...f, [key]: val } : f));
    };
    const selectValue = (col) => {
        const val = getFilter(col)?.value;
        return val === '' ? [] : val.split(',');
    };

    const handleFilter = () => {
        const table = getTable();
        if (!table) return;
        table.draw();
        filterInstance?.current?.hide();
    };

    const handleClear = () => {
        const table = getTable();
        if (!table) return;
        table.columns().search('');
        table.search('');
        table.draw();
        setFilters(prev => prev.map(f => ({ ...f, value: '' })));
        filterInstance?.current?.hide();
    };

    return (
        <div className="modal fade" ref={filterRef} id="modalFilterCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Cheques</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* N° Cheque + Beneficiario */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('numeroCheque:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('numeroCheque:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_numero"
                                        label="Número de cheque"
                                        value={getFilter('numeroCheque:name')?.value || ''}
                                        onChange={(e) => updateFilter('numeroCheque:name', 'value', e.target.value)}
                                        placeholder="Buscar por número"
                                        error=""
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('beneficiario:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('beneficiario:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_beneficiario"
                                        label="Beneficiario"
                                        value={getFilter('beneficiario:name')?.value || ''}
                                        onChange={(e) => updateFilter('beneficiario:name', 'value', e.target.value)}
                                        placeholder="Buscar por beneficiario"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Concepto */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('concepto:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('concepto:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_concepto"
                                        label="Concepto"
                                        value={getFilter('concepto:name')?.value || ''}
                                        onChange={(e) => updateFilter('concepto:name', 'value', e.target.value)}
                                        placeholder="Buscar por concepto"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Estado + Tipo */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('estadoCheque:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('estadoCheque:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_estado"
                                        label="Estado del cheque"
                                        options={estados}
                                        value={selectValue('estadoCheque:name')}
                                        onChange={(val) => updateFilter('estadoCheque:name', 'value', val.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('tipoCheque:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('tipoCheque:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_tipo"
                                        label="Tipo de cheque"
                                        options={tipos}
                                        value={selectValue('tipoCheque:name')}
                                        onChange={(val) => updateFilter('tipoCheque:name', 'value', val.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fecha expedición (rango) */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="filter_fecha_desde"
                                    label="Fecha expedición — desde"
                                    value={getFilter('fechaExpedicion:name')?.value || ''}
                                    onChange={(e) => updateFilter('fechaExpedicion:name', 'value', e.target.value)}
                                    error=""
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="filter_fecha_hasta"
                                    label="Fecha expedición — hasta"
                                    value={getFilter('fechaExpedicion_hasta:name')?.value || ''}
                                    onChange={(e) => updateFilter('fechaExpedicion_hasta:name', 'value', e.target.value)}
                                    error=""
                                />
                            </div>
                        </div>

                        {/* Valor (rango) */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="filter_valor_desde"
                                    label="Valor — desde"
                                    placeholder="0.00"
                                    value={getFilter('valorCheque:name')?.value || ''}
                                    onChange={(e) => updateFilter('valorCheque:name', 'value', e.target.value)}
                                    error=""
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="filter_valor_hasta"
                                    label="Valor — hasta"
                                    placeholder="0.00"
                                    value={getFilter('valorCheque_hasta:name')?.value || ''}
                                    onChange={(e) => updateFilter('valorCheque_hasta:name', 'value', e.target.value)}
                                    error=""
                                />
                            </div>
                        </div>

                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleFilter}>
                            Filtrar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleClear}>
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

export default FilterCheque;
