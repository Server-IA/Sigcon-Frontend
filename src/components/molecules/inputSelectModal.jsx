import { useEffect, useRef, useState } from 'react';
import { base_url } from '../../utils/functions';

const InputSelectModal = ({
    id, label, value, onChange, error, options, placeholder,
    clearable = false, multiple = false, required = false, disabled = false,
    url = null,
    searchFields = ['code', 'name']
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
                noResults: () => 'No se encontraron resultados',
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
    
        if (!value) return;

        if($select.find(`option[value="${value}"]`).length) {
            $select.val(value).trigger('change.select2');
            return;
        }

        if (url) {
            const item = options.find(item => item.id == value);
            const option = new Option(item.text, item.id, true, true);
            $select.append(option).trigger('change.select2');
        }
    
    }, [value]);

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
