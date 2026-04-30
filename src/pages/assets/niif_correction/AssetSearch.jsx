import { useState, useEffect, useRef } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * AssetSearch — campo de búsqueda de activos con autocomplete.
 *
 * Llama a POST /api/v1/assets/search con el formato DataTable:
 * {
 *   draw: 1, start: 0, length: 10,
 *   columns: [{ data: "assetCode", name: "string", searchable: true, orderable: true,
 *               search: { value: "", regex: true } }],
 *   search: { value: "<término>", regex: true }
 * }
 *
 * Props:
 *  - onSelect(asset)  → se llama al seleccionar un activo. asset = { id, assetCode, name, description }
 *  - selectedAsset    → activo actualmente seleccionado (para mostrar la etiqueta)
 *  - error            → mensaje de error a mostrar debajo del campo
 *  - required         → booleano
 */
const AssetSearch = ({ onSelect, selectedAsset, error, required = false }) => {
    const [query,       setQuery]       = useState('');
    const [results,     setResults]     = useState([]);
    const [isLoading,   setIsLoading]   = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef  = useRef(null);
    const wrapperRef   = useRef(null);

    // Cerrar dropdown al hacer click afuera
    useEffect(() => {
        const onClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    // Buscar con debounce de 350ms
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const payload = {
                    draw:    1,
                    start:   0,
                    length:  10,
                    columns: [{
                        data:       'assetCode',
                        // QA-BLOQUE-AR (2026-04-30): name="string" hacia que el
                        // DataTableSpecificationBuilder no resolviera el path JPA y
                        // search global retornaba 0 resultados. assetCode es campo
                        // directo de la entidad Assets.
                        name:       'assetCode',
                        searchable: true,
                        orderable:  true,
                        search:     { value: '', regex: true },
                    }],
                    search: { value: query.trim(), regex: true },
                };

                const response = await fetchHelper.post(
                    base_url(['api', 'v1', 'assets', 'search']),
                    payload,
                    {},
                    8000
                );

                // Normalizar respuesta (puede venir como array, { data: [] } o { data: { data: [] } })
                let items = [];
                const raw = response?.data ?? response;
                if (Array.isArray(raw))             items = raw;
                else if (Array.isArray(raw?.data))  items = raw.data;
                else if (Array.isArray(raw?.results)) items = raw.results;

                setResults(items.slice(0, 10));
                setShowDropdown(true);
            } catch (err) {
                console.warn('Error buscando activos:', err);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 350);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const handleSelect = (asset) => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
        onSelect(asset);
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
        onSelect(null);
    };

    // Si hay un activo seleccionado mostrar etiqueta, sino el input de búsqueda
    if (selectedAsset) {
        return (
            <div>
                <label className="form-label" style={{ fontSize: '0.875rem' }}>
                    Activo {required && <span className="text-danger">*</span>}
                </label>
                <div
                    className={`d-flex align-items-center gap-2 p-2 rounded border ${error ? 'border-danger' : 'border-secondary'}`}
                    style={{ fontSize: '0.875rem', backgroundColor: 'var(--bs-body-bg)' }}
                >
                    <i className="ri-box-3-line text-primary" />
                    <div className="flex-grow-1">
                        <span className="fw-semibold">{selectedAsset.assetCode ?? selectedAsset.id}</span>
                        {selectedAsset.name && <span className="ms-1 text-muted">— {selectedAsset.name}</span>}
                        {selectedAsset.description && (
                            <div style={{ fontSize: '0.8rem' }} className="text-muted">{selectedAsset.description}</div>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary p-1 lh-1"
                        onClick={handleClear}
                        title="Cambiar activo"
                        style={{ fontSize: '0.75rem' }}
                    >
                        <i className="ri-close-line" />
                    </button>
                </div>
                {error && <div className="text-danger" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>{error}</div>}
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="form-label" style={{ fontSize: '0.875rem' }}>
                Activo {required && <span className="text-danger">*</span>}
            </label>
            <div className="input-group input-group-merge">
                <span className="input-group-text">
                    {isLoading
                        ? <span className="spinner-border spinner-border-sm" role="status" />
                        : <i className="ri-search-line" />}
                </span>
                <input
                    type="text"
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    placeholder="Buscar por código de activo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                    autoComplete="off"
                    style={{ fontSize: '0.875rem' }}
                />
                {error && <div className="invalid-feedback">{error}</div>}
            </div>

            {/* Dropdown de resultados */}
            {showDropdown && (
                <div
                    className="border rounded shadow-sm"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        backgroundColor: 'var(--bs-body-bg)',
                        maxHeight: '260px',
                        overflowY: 'auto',
                    }}
                >
                    {results.length === 0 ? (
                        <div className="px-3 py-2 text-muted" style={{ fontSize: '0.85rem' }}>
                            Sin resultados para &ldquo;{query}&rdquo;
                        </div>
                    ) : (
                        results.map((asset, idx) => (
                            <button
                                key={asset.id ?? idx}
                                type="button"
                                className="d-flex flex-column w-100 px-3 py-2 text-start border-0 bg-transparent"
                                style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bs-tertiary-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={() => handleSelect(asset)}
                            >
                                <span className="fw-semibold">
                                    {asset.assetCode ?? `ID: ${asset.id}`}
                                </span>
                                {asset.name && (
                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>{asset.name}</span>
                                )}
                                {asset.description && (
                                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>{asset.description}</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AssetSearch;
