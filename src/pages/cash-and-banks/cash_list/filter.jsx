import { useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const TIPOS_CAJA = [
    { id: 'GENERAL',    label: 'General' },
    { id: 'MENOR',      label: 'Menor' },
    { id: 'FONDO_FIJO', label: 'Fondo Fijo' },
];

const ESTADOS_CAJA = [
    { id: 'ACTIVA',   label: 'Activa' },
    { id: 'INACTIVA', label: 'Inactiva' },
    { id: 'CERRADA',  label: 'Cerrada' },
];

const LIBROS_CONTABLES = [
    { id: 'LOCAL',  label: 'Local' },
    { id: 'NIIF',   label: 'NIIF' },
    { id: 'FISCAL', label: 'Fiscal' },
];

const emptyFilter = {
    codigoCaja: '',
    nombreCaja: '',
    tipoCaja: '',
    ubicacionFisica: '',
    monedaCodigo: '',
    estadoCaja: '',
    libroContable: '',
    fechaCreacionDesde: '',
    fechaCreacionHasta: '',
};

export default function FilterCaja({ filterRef, filterInstance, dataTableRef }) {
    const [filters, setFilters] = useState(emptyFilter);

    const set = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const handleApply = () => {
        dataTableRef?.current?.ajax?.reload?.();
        filterInstance?.current?.hide();
    };

    const handleClear = () => setFilters(emptyFilter);

    return (
        <div className="modal fade" ref={filterRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title"><i className="ri-filter-line me-2" />Filtrar Cajas</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputModal id="cf_codigo" label="Código de Caja" value={filters.codigoCaja}
                                    onChange={e => set('codigoCaja', e.target.value)} placeholder="Búsqueda exacta" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal id="cf_nombre" label="Nombre de Caja" value={filters.nombreCaja}
                                    onChange={e => set('nombreCaja', e.target.value)} placeholder="Búsqueda parcial" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal id="cf_tipo" label="Tipo de Caja" value={filters.tipoCaja}
                                    onChange={v => set('tipoCaja', v)} options={TIPOS_CAJA} placeholder="Todos los tipos" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal id="cf_estado" label="Estado" value={filters.estadoCaja}
                                    onChange={v => set('estadoCaja', v)} options={ESTADOS_CAJA} placeholder="Todos los estados" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal id="cf_ubicacion" label="Ubicación Física" value={filters.ubicacionFisica}
                                    onChange={e => set('ubicacionFisica', e.target.value)} placeholder="Búsqueda parcial" />
                            </div>
                            <div className="col-md-3 mb-3">
                                <InputModal id="cf_moneda" label="Moneda" value={filters.monedaCodigo}
                                    onChange={e => set('monedaCodigo', e.target.value)} placeholder="Ej: COP" />
                            </div>
                            <div className="col-md-3 mb-3">
                                <InputSelectModal id="cf_libro" label="Libro Contable" value={filters.libroContable}
                                    onChange={v => set('libroContable', v)} options={LIBROS_CONTABLES} placeholder="Todos" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal id="cf_fecha_desde" label="Fecha Creación Desde" type="date"
                                    value={filters.fechaCreacionDesde}
                                    onChange={e => set('fechaCreacionDesde', e.target.value)} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal id="cf_fecha_hasta" label="Fecha Creación Hasta" type="date"
                                    value={filters.fechaCreacionHasta}
                                    onChange={e => set('fechaCreacionHasta', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                            <i className="ri-refresh-line me-1" />Limpiar
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleApply}>
                            <i className="ri-filter-line me-1" />Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
