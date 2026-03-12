import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const FilterSegmentation = ({
    filterRef,
    filterInstance,
    dataTableRef,
    segments,
    adjustmentTypes,
}) => {

    const initialFilters = [
        { regex: true,  value: '', column: 'clientName:name' },
        { regex: false, value: '', column: 'autoSegment:name' },
        { regex: false, value: '', column: 'finalSegment:name' },
        { regex: false, value: '', column: 'adjustmentType:name' },
    ];

    const [filters, setFilters] = useState(initialFilters);

    const getTable  = () => dataTableRef?.current;
    const getFilter = (col) => filters.find(f => f.column === col);

    const updateFilter = (col, key, val) => {
        setFilters(prev => prev.map(f => f.column === col ? { ...f, [key]: val } : f));
    };

    const selectValue = (col) => {
        const f = getFilter(col);
        return f?.value ? f.value.split(',').filter(Boolean) : [];
    };

    // Aplicar filtros en tiempo real (búsquedas de texto)
    useEffect(() => {
        const table = getTable();
        if (!table) return;

        filters.forEach(f => {
            table.column(f.column).search(f.value, f.regex, false);
        });
    }, [filters]);

    const handleFilter = () => {
        const table = getTable();
        if (!table) return;
        table.draw();
        filterInstance?.current?.hide();
    };

    const handleClear = () => {
        setFilters(initialFilters);
        const table = getTable();
        if (!table) return;
        table.columns().search('');
        table.search('');
        table.draw();
    };

    return (
        <div
            className="modal fade"
            ref={filterRef}
            id="modalFilterSegmentation"
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Segmentación ECL</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" />
                    </div>

                    <div className="modal-body">

                        <div className="row g-3">

                            {/* Nombre del cliente */}
                            <div className="col-md-6">
                                <InputModal
                                    type="text"
                                    id="filter_ecl_clientName"
                                    label="Nombre del cliente"
                                    value={getFilter('clientName:name')?.value || ''}
                                    onChange={(e) => updateFilter('clientName:name', 'value', e.target.value)}
                                    placeholder="Buscar por nombre..."
                                />
                            </div>

                            {/* Segmento automático */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="filter_ecl_autoSegment"
                                    label="Segmento automático"
                                    value={selectValue('autoSegment:name')}
                                    onChange={(val) => updateFilter('autoSegment:name', 'value', Array.isArray(val) ? val.join(',') : val)}
                                    options={segments}
                                    multiple={true}
                                />
                            </div>

                            {/* Segmento final */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="filter_ecl_finalSegment"
                                    label="Segmento final"
                                    value={selectValue('finalSegment:name')}
                                    onChange={(val) => updateFilter('finalSegment:name', 'value', Array.isArray(val) ? val.join(',') : val)}
                                    options={segments}
                                    multiple={true}
                                />
                            </div>

                            {/* Tipo de ajuste */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="filter_ecl_adjustmentType"
                                    label="Tipo de ajuste"
                                    value={selectValue('adjustmentType:name')}
                                    onChange={(val) => updateFilter('adjustmentType:name', 'value', Array.isArray(val) ? val.join(',') : val)}
                                    options={adjustmentTypes}
                                    multiple={true}
                                />
                            </div>

                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary waves-effect"
                            onClick={handleClear}
                        >
                            <i className="ri-refresh-line me-1" /> Limpiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary waves-effect waves-light"
                            onClick={handleFilter}
                        >
                            <i className="ri-filter-line me-1" /> Filtrar
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FilterSegmentation;
