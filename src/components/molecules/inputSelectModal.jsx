import { useEffect, useRef } from 'react';
// import $ from 'jquery';

// window.$ = window.jQuery = $;

// import 'select2/dist/css/select2.css';
// import 'select2/dist/js/select2.js';
// import "../../styles/vendor/select2/select2.js";
// import "../../styles/vendor/select2/select2.css";

const InputSelectModal = ({ id, label, value, onChange, error, options, placeholder, clearable = false }) => {

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
            placeholder: placeholder || 'Seleccione una opción',
            width: '100%',
            allowClear: clearable
        });

        const handleChange = function () {
            const newValue = $(this).val();
            onChangeRef.current?.(newValue);

            console.log([value, newValue, options])
        };

        $select.on('change', handleChange);

        return () => {
            $select.off('change', handleChange);
            $select.select2('destroy');
        };
    }, []);

    useEffect(() => {
        const $select = $(selectRef.current);

        // destruir si existe
        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2('destroy');
        }

        // reinicializar
        $select.select2({
            dropdownParent: $select.parent(),
            placeholder: placeholder || 'Seleccione una opción',
            width: '100%',
            allowClear: clearable
        });

        // restaurar valor
        $select.val(value).trigger('change.select2');
    }, [error]);

    // Sincronizar value desde React
    useEffect(() => {
        $(selectRef.current).val(value).trigger('change.select2');
    }, [value]);

    return (
        <div className="form-floating form-floating-outline">
            <select
                id={id}
                ref={selectRef}
                className={`form-select ${error ? 'is-invalid' : ''}`}
            >
                <option value="">{placeholder || 'Seleccione una opción'}</option>
                {options.map(option => (
                    <option key={option.id} value={option.id}>
                        {option.label || option.name}
                    </option>
                ))}
            </select>
            <label htmlFor={id}>{label}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export default InputSelectModal;
