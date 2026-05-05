import { useEffect, useState } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

const FilterSegmentation = ({ filterRef, filterInstance, dataTableRef, segments, adjustmentTypes }) => {

    const getTable = () => dataTableRef?.current;

    // clientId se maneja aparte (GET endpoint), no como column search
    const [clientId, setClientId] = useState('');

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'finalSegment:name'       },
        { regex: true, value: '', column: 'segmentationSource:name' },
    ]);

    const [loading,      setLoading]      = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(f => {
            table.column(f.column).search(f.value, f.regex, false);
        });
    }, [filters]);

    const getFilter    = (col) => filters.find(f => f.column === col);
    const updateFilter = (col, key, val) =>
        setFilters(prev => prev.map(f => f.column === col ? { ...f, [key]: val } : f));

    const handleFilter = async () => {
        setErrorMessage('');
        const t = getTable();
        if (!t) return;

        // Aplicar column searches sincrónicamente antes del draw
        filters.forEach(f => {
            t.column(f.column).search(f.value, f.regex, false);
        });

        if (clientId.trim() !== '') {
            try {
                setLoading(true);
                await fetchHelper.get(base_url(['api', 'v1', 'ecl-segmentation', clientId.trim()]), {}, 1000);
                t.search(clientId.trim(), false, true);
                t.draw();
                filterInstance?.current?.hide();
            } catch (error) {
                setErrorMessage(error?.msg || `No se encontró segmentación para el cliente ID ${clientId.trim()}`);
            } finally {
                setLoading(false);
            }
        } else {
            t.search('', false, false);
            t.draw();
            filterInstance?.current?.hide();
        }
    };

    return (
        <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Segmentación ECL</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={!!errorMessage}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row">

                            {/* ID Cliente */}
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="filter_ecl_clientId"
                                    label="ID Cliente"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="Buscar por ID"
                                />
                            </div>

                            {/* Segmentación */}
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('finalSegment:name')?.regex ?? false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            onChange={(e) => updateFilter('finalSegment:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_ecl_finalSegment"
                                        label="Segmentación"
                                        options={segments}
                                        value={
                                            getFilter('finalSegment:name')?.value === ''
                                                ? []
                                                : (getFilter('finalSegment:name')?.value ?? '').split('|')
                                        }
                                        onChange={(val) =>
                                            updateFilter('finalSegment:name', 'value', (val || []).join('|'))
                                        }
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            {/* Tipo de ajuste */}
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('segmentationSource:name')?.regex ?? false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            onChange={(e) => updateFilter('segmentationSource:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_ecl_segmentationSource"
                                        label="Tipo de ajuste"
                                        options={adjustmentTypes}
                                        value={
                                            getFilter('segmentationSource:name')?.value === ''
                                                ? []
                                                : (getFilter('segmentationSource:name')?.value ?? '').split('|')
                                        }
                                        onChange={(val) =>
                                            updateFilter('segmentationSource:name', 'value', (val || []).join('|'))
                                        }
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
                            onClick={handleFilter}
                            disabled={loading}
                        >
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Buscando...</>
                                : 'Filtrar'
                            }
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                setErrorMessage('');
                                setClientId('');
                                setFilters([
                                    { regex: true, value: '', column: 'finalSegment:name'       },
                                    { regex: true, value: '', column: 'segmentationSource:name' },
                                ]);
                                const t = getTable();
                                if (t) { t.columns().search(''); t.search(''); t.draw(); }
                            }}
                        >
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

export default FilterSegmentation;
