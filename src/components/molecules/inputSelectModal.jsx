import { useEffect, useRef, useState } from 'react';
import { base_url } from '../../utils/functions';

const InputSelectModal = ({
    id, label, value, onChange, error, options, placeholder, readOnly = false,
    clearable = false, multiple = false, required = false, disabled = false,
    url = null,
    searchFields = ['code', 'name'],
    emptyMessage = null
}) => {

    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {

        const $select = $(selectRef.current);

        // destruir si existe
        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2('destroy');
        }

        // Inicializar Select2
        $select.select2({
            dropdownParent: $select.parent(), // clave si está en modal
            placeholder: url != null ? `Cargando ${placeholder}...` : placeholder || 'Seleccione una opción',
            ...(
                url != null ? {
                    // minimumInputLength: 2,
                    ajax: {
                        url: base_url(url),
                        dataType: 'json',
                        method: 'POST',
                        contentType: 'application/json',
                        beforeSend: function (xhr) {
                            const token = localStorage.getItem('token'); // o donde lo guardes
                            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                        },
                        ...(readOnly == true ? {
                            disabled: true
                        } : {}),
                        delay: 500,
                        data: function (params) {
                            return JSON.stringify({
                                length: 50,
                                columns: searchFields.map(s => ({
                                    data: s,
                                    name: '',
                                    searchable: true
                                })),
                                search: {
                                    value: params.term,
                                    regex: true
                                }
                            });
                        },
                        processResults: function (data) {
                            return {
                                results: data.data.map(item => ({
                                    id: item.id,
                                    text: searchFields.map(f => item[f]).join(' - ')
                                }))
                            };
                        }
                    }
                } : {}
            ),
            width: '100%',
            allowClear: required ? false : clearable,
            language: {
                noResults: () => (emptyMessage && (!options || options.length === 0))
                    ? emptyMessage
                    : 'No se encontraron resultados',
            }
        });

        const handleChange = function () {
            const newValue = $(this).val();
            onChangeRef.current?.(newValue);
        };

        $select.on('change', handleChange);

        $select.val(value).trigger('change.select2');

        return () => {
            $select.off('change', handleChange);
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }
        };
    }, [options, error]);

    // Sincronizar value desde React
    useEffect(() => {
        const $select = $(selectRef.current);

        // QA-BLOQUE-AU (2026-04-30): soportar value=array para multiple=true.
        // Antes el sync solo manejaba escalares: cuando value=[1,2,3], el
        // template literal lo serializaba como "1,2,3" y nunca matcheaba
        // option[value="1,2,3"]. Resultado: las opciones precargadas no se
        // mostraban en el Select2, el usuario las re-seleccionaba y al guardar
        // sobrescribia con las nuevas (perdiendo las antiguas).
        if (value === null || value === undefined || value === '') return;

        if (multiple) {
            const arr = Array.isArray(value)
                ? value.map(v => String(v))
                : (typeof value === 'string' && value.length > 0
                    ? value.split(',').map(s => s.trim()).filter(Boolean)
                    : []);
            if (arr.length === 0) {
                $select.val(null).trigger('change.select2');
                return;
            }
            // Para cada id en el array, asegurar que existe la option en el DOM
            // (si no, agregarla) y luego setear val() con todos los ids juntos.
            arr.forEach((id) => {
                if ($select.find(`option[value="${id}"]`).length === 0) {
                    const item = (options || []).find(o => String(o.id) === String(id));
                    const text = item?.label ?? item?.name ?? item?.text ?? String(id);
                    $select.append(new Option(text, id, true, true));
                }
            });
            $select.val(arr).trigger('change.select2');
            return;
        }

        if($select.find(`option[value="${value}"]`).length) {
            $select.val(value).trigger('change.select2');
            return;
        }

        if (url) {
            // Defensive: si options esta vacio o el id no esta entre las opciones
            // cargadas, NO crasheamos. Antes se hacia `new Option(item.text, ...)`
            // sin null-check y reventaba toda la pagina con
            // "Cannot read properties of undefined (reading 'text')".
            const item = (options || []).find(item => item.id == value);
            if (!item) return;
            const text = item.label ?? item.name ?? item.text ?? String(item.id);
            const option = new Option(text, item.id, true, true);
            $select.append(option).trigger('change.select2');
        }

    }, [value, multiple]);

    return (
        <div className="form-floating form-floating-outline">
            <select
                id={id}
                ref={selectRef}
                className={`form-select ${error ? 'is-invalid' : ''}`}
                multiple={multiple}
                disabled={disabled}
            >
                <option value="">{placeholder || 'Seleccione una opción'}</option>
                {url == null ? options.map((option, idx) => (
                    <option key={`${String(option.id).replace(/\s+/g, '_')}_${String(id).replace(/\s+/g, '_')}_${idx}`} value={option.id}>
                        {option.label || option.name}
                    </option>
                )) : null}
            </select>
            <label htmlFor={id}>{label} {required ? <span className="text-danger">*</span> : null}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export default InputSelectModal;
