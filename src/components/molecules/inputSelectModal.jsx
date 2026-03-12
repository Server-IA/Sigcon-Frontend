import { useEffect, useRef } from 'react';

const InputSelectModal = ({ id, label, value, onChange, error, options, placeholder, clearable = false, multiple = false, required = false, disabled = false }) => {

    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        console.log(id);
        console.log(options);
    }, []);

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
            allowClear: required ? false : clearable,
            language: {
                noResults: () => 'No se encontraron resultados'
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
        $(selectRef.current).val(value).trigger('change.select2');
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
                {options.map(option => (
                    <option key={`${String(option.id).replace(/\s+/g, '_')}_${String(id).replace(/\s+/g, '_')}`} value={option.id}>
                        {option.label || option.name}
                    </option>
                ))}
            </select>
            <label htmlFor={id}>{label} {required ? <span className="text-danger">*</span> : null}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export default InputSelectModal;
