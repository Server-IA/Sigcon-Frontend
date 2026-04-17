import { Link as RouterLink } from 'react-router-dom';

const Link = ({ to, children, className = "" }) => {
  return (
    <RouterLink 
      to={to} 
      className={`forgot-password-link ${className}`}
    >
      {children}
    </RouterLink>
  );
};

export default Link;