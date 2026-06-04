import { useEffect, useState } from 'react';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const FilterCheque = ({ filterRef, filterInstance, dataTableRef, estados, tipos }) => {

    const getTable = () => dataTableRef?.current?.table();

    const [filters, setFilters] = useState([
        { regex: true,  value: '', column: 'numberCheck:name' },
        { regex: true,  value: '', column: 'beneficiary:name' },
        { regex: true,  value: '', column: 'concept:name' },
        { regex: true,  value: '', column: 'statusCheck:name' },
        { regex: true,  value: '', column: 'typeCheck:name' },
        { regex: false, value: '', column: 'issueDate:name' },
        { regex: false, value: '', column: 'issueDate_hasta:name' },
        { regex: false, value: '', column: 'value:name' },
        { regex: false, value: '', column: 'value_hasta:name' },
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
        // QA BNK (2026-06-03) BNK-RF-18: el valor "desde" del rango debe ser
        // numerico >= 0.
        const desde = getFilter('value:name')?.value;
        if (desde !== '' && desde != null && (Number.isNaN(Number(desde)) || Number(desde) < 0)) {
            window.Swal?.fire?.({ icon: 'warning', title: 'Rango inválido', text: 'El valor "desde" debe ser un número mayor o igual a cero.' });
            return;
        }
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
                                            checked={getFilter('numberCheck:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('numberCheck:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_numero"
                                        label="Número de cheque"
                                        value={getFilter('numberCheck:name')?.value || ''}
                                        onChange={(e) => updateFilter('numberCheck:name', 'value', e.target.value)}
                                        placeholder="Buscar por número"
                                        error=""
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('beneficiary:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('beneficiary:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_beneficiario"
                                        label="Beneficiario"
                                        value={getFilter('beneficiary:name')?.value || ''}
                                        onChange={(e) => updateFilter('beneficiary:name', 'value', e.target.value)}
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
                                            checked={getFilter('concept:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('concept:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_concepto"
                                        label="Concepto"
                                        value={getFilter('concept:name')?.value || ''}
                                        onChange={(e) => updateFilter('concept:name', 'value', e.target.value)}
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
                                            checked={getFilter('statusCheck:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('statusCheck:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_estado"
                                        label="Estado del cheque"
                                        options={estados}
                                        value={selectValue('statusCheck:name')}
                                        onChange={(val) => updateFilter('statusCheck:name', 'value', val.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('typeCheck:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('typeCheck:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_tipo"
                                        label="Tipo de cheque"
                                        options={tipos}
                                        value={selectValue('typeCheck:name')}
                                        onChange={(val) => updateFilter('typeCheck:name', 'value', val.join(','))}
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
                                    value={getFilter('issueDate:name')?.value || ''}
                                    onChange={(e) => updateFilter('issueDate:name', 'value', e.target.value)}
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
                                    value={getFilter('value:name')?.value || ''}
                                    onChange={(e) => updateFilter('value:name', 'value', e.target.value)}
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
