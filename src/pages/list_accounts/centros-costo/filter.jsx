import { useEffect, useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const FilterCentroCosto = ({ filterRef, filterInstance, dataTableRef }) => {
    const getTable = () => dataTableRef?.current;

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'code:name' },
        { regex: true, value: '', column: 'name:name' },
        { regex: true, value: '', column: 'status:name' },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach((filter) => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
    }, [filters]);

    return (
        <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar centros de costo</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find((f) => f.column === 'code:name')?.regex ?? false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters((prev) =>
                                                    prev.map((f) => (f.column === 'code:name' ? { ...f, regex: e.target.checked } : f))
                                                );
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="code_filter"
                                        label="Código"
                                        value={filters.find((f) => f.column === 'code:name')?.value ?? ''}
                                        onChange={(e) => {
                                            setFilters((prev) =>
                                                prev.map((f) => (f.column === 'code:name' ? { ...f, value: e.target.value } : f))
                                            );
                                        }}
                                        placeholder="Buscar por código"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find((f) => f.column === 'name:name')?.regex ?? false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters((prev) =>
                                                    prev.map((f) => (f.column === 'name:name' ? { ...f, regex: e.target.checked } : f))
                                                );
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="name_filter"
                                        label="Nombre"
                                        value={filters.find((f) => f.column === 'name:name')?.value ?? ''}
                                        onChange={(e) => {
                                            setFilters((prev) =>
                                                prev.map((f) => (f.column === 'name:name' ? { ...f, value: e.target.value } : f))
                                            );
                                        }}
                                        placeholder="Buscar por nombre"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={filters.find((f) => f.column === 'status:name')?.regex ?? false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            onChange={(e) => {
                                                setFilters((prev) =>
                                                    prev.map((f) => (f.column === 'status:name' ? { ...f, regex: e.target.checked } : f))
                                                );
                                            }}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="status_filter"
                                        label="Estado"
                                        options={[
                                            { name: 'Activo', id: 'ACTIVE' },
                                            { name: 'Inactivo', id: 'INACTIVE' },
                                        ]}
                                        value={
                                            filters.find((f) => f.column === 'status:name')?.value === ''
                                                ? []
                                                : (filters.find((f) => f.column === 'status:name')?.value ?? '').split(',')
                                        }
                                        onChange={(value) => {
                                            setFilters((prev) =>
                                                prev.map((f) => (f.column === 'status:name' ? { ...f, value: (value || []).join(',') } : f))
                                            );
                                        }}
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
                            onClick={() => {
                                const t = getTable();
                                if (t) t.draw();
                                filterInstance?.current?.hide();
                            }}
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                // HU-CFG-RF-19 (Bloque AQ, 2026-05-04): Limpiar debe vaciar
                                // los inputs y refrescar tabla SIN cerrar el modal. Antes el
                                // .hide() saca al usuario del modal sin feedback visual.
                                setFilters((prev) => prev.map((f) => ({ ...f, value: '' })));
                                const t = getTable();
                                if (t) {
                                    t.columns().search('');
                                    t.search('');
                                    t.draw();
                                }
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

export default FilterCentroCosto;
