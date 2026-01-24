import Label from "../atoms/Label";
import Input from "../atoms/Input";

const InputField = ({ 
  id, 
  name, 
  label, 
  type = 'text',
  placeholder, 
  value, 
  onChange,
  hasError = false,
  required = false,
  rightElement
}) => {
  return (
    <div className="input-field">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="input-field-container">
        <div className="input-field-wrapper">
          <Input 
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            hasError={hasError}
            required={required}
          />
          {rightElement && (
            <div className="input-field-icon">
              {rightElement}
            </div>
          )}
        </div>
        {hasError && (
          <span className="input-error-indicator-external" aria-label="Error">
            ●
          </span>
        )}
      </div>
    </div>
  );
};

export default InputField;