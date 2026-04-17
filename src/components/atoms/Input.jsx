const Input = ({ 
  type = 'text', 
  placeholder, 
  hasError = false,
  value, 
  onChange, 
  name, 
  id,
  required = false
}) => {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={`input ${hasError ? 'input-error' : ''}`}
      autoComplete={type === "password" ? "current-password" : "off"}
    />
  );
};

export default Input;