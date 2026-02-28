import { useEffect, useRef } from 'react';

/**
 * FormField - Molécula reutilizable para campos de formulario de reportes.
 * 
 * Props:
 * - type: 'text' | 'select' | 'search' (tipo de campo)
 * - id: string (identificador único del campo)
 * - label: string (etiqueta del campo)
 * - value: string | number (valor actual)
 * - onChange: function (callback de cambio)
 * - options: array de { id, label/name } (para type='select')
 * - placeholder: string
 * - helperText: string (texto de ayuda debajo del campo)
 * - error: string (mensaje de error)
 * - required: boolean
 * - disabled: boolean
 * - readOnly: boolean
 * - clearable: boolean (para select, permite limpiar)
 * - colClass: string (clase Bootstrap para columna, por defecto 'col-md-6')
 */
const FormField = ({
    type = 'text',
    id,
    label,
    value,
    onChange,
    options = [],
    placeholder = '',
    helperText = '',
    error = '',
    required = false,
    disabled = false,
    readOnly = false,
    clearable = false,
    colClass = 'col-md-6',
}) => {
    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Select2 initialization for 'select' type
    useEffect(() => {
        if (type !== 'select' || !selectRef.current) return;

        const $select = $(selectRef.current);

        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }

        $select.select2({
            dropdownParent: $select.closest('.form-field-wrapper'),
            placeholder: placeholder || 'Seleccione una opción',
            width: '100%',
            allowClear: required ? false : clearable,
            language: {
                noResults: () => 'No se encontraron resultados',
            },
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
    }, [type, options, error]);

    // Sync value for select
    useEffect(() => {
        if (type === 'select' && selectRef.current) {
            $(selectRef.current).val(value).trigger('change.select2');
        }
    }, [value, type]);

    const renderInput = () => {
        switch (type) {
            case 'select':
                return (
                    <div className="form-field-wrapper">
                        <div className="form-floating form-floating-outline">
                            <select
                                id={id}
                                ref={selectRef}
                                className={`form-select ${error ? 'is-invalid' : ''}`}
                                disabled={disabled}
                            >
                                <option value="">{placeholder || 'Seleccione una opción'}</option>
                                {options.map((option) => (
                                    <option key={String(option.id).replace(/\s+/g, '_')} value={option.id}>
                                        {option.label || option.name}
                                    </option>
                                ))}
                            </select>
                            <label htmlFor={id}>
                                {label} {required && <span className="text-danger">*</span>}
                            </label>
                            {error && <div className="invalid-feedback">{error}</div>}
                        </div>
                    </div>
                );

            case 'search':
                return (
                    <div className="form-floating form-floating-outline">
                        <input
                            type="text"
                            id={id}
                            className={`form-control ${error ? 'is-invalid' : ''}`}
                            placeholder={placeholder}
                            value={value ?? ''}
                            onChange={(e) => onChange?.(e.target.value)}
                            disabled={disabled}
                            readOnly={readOnly}
                        />
                        <label htmlFor={id}>
                            {label} {required && <span className="text-danger">*</span>}
                        </label>
                        {error && <div className="invalid-feedback">{error}</div>}
                    </div>
                );

            default: // 'text'
                return (
                    <div className="form-floating form-floating-outline">
                        <input
                            type={type}
                            id={id}
                            className={`form-control ${error ? 'is-invalid' : ''} ${required ? 'required' : ''}`}
                            placeholder={placeholder}
                            value={value ?? ''}
                            onChange={(e) => onChange?.(e.target.value)}
                            disabled={disabled}
                            readOnly={readOnly}
                        />
                        <label htmlFor={id}>
                            {label} {required && <span className="text-danger">*</span>}
                        </label>
                        {error && <div className="invalid-feedback">{error}</div>}
                    </div>
                );
        }
    };

    return (
        <div className={`${colClass} mb-3`}>
            {renderInput()}
            {helperText && (
                <small className="form-text text-muted d-block mt-1">{helperText}</small>
            )}
        </div>
    );
};

export default FormField;
